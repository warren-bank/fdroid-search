// https://f-droid.org/js/fdroid-search-autocomplete.js

(function() {

    /**
     * Loads an index.json file built by jekyll-fdroid via AJAX. Once loaded, it is passed to buildIndex()
     * which will construct the search index and also add the search widget to the DOM.
     */
    function loadIndex(config) {
        disable_button_state(config.element);

        var http = new XMLHttpRequest();
        http.onreadystatechange = function () {
            if (http.readyState === XMLHttpRequest.DONE && http.status === 200) {
                var data = JSON.parse(http.responseText);
                buildIndex(config, data.docs, data.index);
            }
        };

        // ====================================================================
        // CORS prevents directly accessing the Lunr index on the "live" server:
        //     https://f-droid.org/js/index.json
        //
        // The "staging" server includes CORS headers in the response that grant access:
        //     https://fdroid.gitlab.io/fdroid-website/js/index.json
        //
        // If this was ever to change, then it would be necessary to cache a local copy:
        //     ./json/index.json
        // ====================================================================
        // http.open('GET', config.baseurl + '/js/index.json', true);

        http.open('GET', 'https://fdroid.gitlab.io/fdroid-website/js/index.json', true);
        http.send();
    }

    /**
     * Iterate over the packages provided, and for each ensure the name + summary is indexed. Theoretically we could
     * of course index the description too, but given the rate at which this would increase the index size, it is to
     * be avoided. Note that lunr.js allows us to prebuild the index to save time, but this may not be a good idea
     * because:
     *  * We still need the original documents, and so we will end up making two web requests (one for documents
     *    and one for the index).
     */
    function buildIndex(config, packages, index) {
        for (var packageId in packages) {
            if (packages.hasOwnProperty(packageId)) {
                var pkg = packages[packageId];
                pkg.icon_url = config.fdroidRepo + '/icons/' + pkg.icon;
            }
        }

        index = lunr.Index.load(index);

        var autocomplete = setupSearch(config);

        // ====================================================================
        // patch the behavior for: blur/focus
        //     https://github.com/LeaVerou/awesomplete/blob/gh-pages/awesomplete.js
        // ====================================================================
        Awesomplete.$.unbind(autocomplete.input, {blur: autocomplete._events.input.blur})

        var display_search_results = function(page_number) {
            if (document.activeElement !== autocomplete.input) {
              autocomplete.input.focus()
            }

            performSearch(autocomplete, index, packages, autocomplete.input.value, config.minChars, config.results_per_page, page_number, config.element);
        }

        autocomplete.input.oninput = function() {
            display_search_results(1);
        };

        config.element.querySelector('#prev-page').onclick = function() {
            display_search_results(window.FDroid.Search.page_number - 1);
        };

        config.element.querySelector('#next-page').onclick = function() {
            display_search_results(window.FDroid.Search.page_number + 1);
        };

        // pre-populate the search input field from the URL #hash:
        if (window.location.hash && (window.location.hash.length > (1 + config.minChars))) {
          autocomplete.input.value = decodeURIComponent(window.location.hash).substr(1);
          if (window.history.replaceState) {
            window.history.replaceState(undefined, undefined, window.location.href.replace(/#.*$/, ''));
          }
          display_search_results(1);
        }

    }

    /**
     * Construct the Awesomplete based on the a dynamically created input element. It is configured to render the Mustache
     * template available in the #search-result-template script element.
     * @returns {Awesomplete}
     */
    function setupSearch(config) {
        var template = config.templateElement.innerHTML;
        Mustache.parse(template);

        var searchInput = document.createElement('input');
        searchInput.type = "text";

        config.element.appendChild(searchInput);

        var autocomplete = new Awesomplete(searchInput, {
            minChars: config.minChars,
            maxItems: config.results_per_page,
            filter: function() { return true; }, // Don't filter, this is done by lunr.js already.
            item: function(item) {
                var node = document.createElement('li');
                node.innerHTML = Mustache.render(template, item.value);
                return node;
            },
            replace: function(item) {
            }
        });

        searchInput.addEventListener('awesomplete-select', function(event) {
            window.open(config.baseurl + '/packages/' + event.text.value.packageName + '/');
            event.preventDefault();
        });

        return autocomplete;
    }

    /**
     * Executed each time the user enteres some new text in the search input.
     * Uses the lunr.js index to perform a search, then update the Awesomplete input with the search results. The
     * search which is performed is a wildcard search.
     * @param {Awesomplete} autocomplete
     * @param {lunr.Index} index
     * @param {Object[]} packages
     * @param {string} terms
     */
    function performSearch(autocomplete, index, packages, terms, minChars, results_per_page, page_number, element) {
        terms = sanitize_search_terms(terms, minChars)

        // when: no viable search terms are entered
        if (terms === false) {
            disable_button_state(element)
            autocomplete.list = []
            delete window.FDroid.Search.current_search_terms
            return
        }

        // when: the search terms have not changed
        if (window.FDroid.Search.current_search_terms === terms) return

        // cache the new search terms
        window.FDroid.Search.current_search_terms = terms

        var results, pages, this_start_index, next_start_index

        results = index.search(terms + "*")
        pages   = Math.ceil(results.length / results_per_page)

        if (page_number > pages) return
        if (page_number < 1) return

        this_start_index = (results_per_page)*(page_number - 1)
        next_start_index = (results_per_page)*(page_number)
        if (next_start_index > results.length) {
            next_start_index = results.length
        }

        window.FDroid.Search.page_number = page_number
        manage_button_state(element, results.length, this_start_index, next_start_index, page_number, pages)

        results = results.slice(this_start_index, next_start_index)
        results = results.map(function(item) {
            return packages[item.ref]
        })
        autocomplete.list = results
    }

    function sanitize_search_terms(terms, minChars) {
        // sanity check
        if (typeof terms !== 'string') {
            return false
        }

        // For performance reasons, filter out all search terms that are shorter than a minimum length.
        // Such terms produce a large number of results, which have no real relevance.
        terms = terms.split(' ').filter(function(term) {
            return (term.length >= minChars)
        })
        if (terms.length === 0) {
            return false
        }
        else {
            return terms.join(' ')
        }
    }

    function manage_button_state(element, results_length, this_start_index, next_start_index, page_number, pages) {
      var prev_page = element.querySelector('#prev-page')
      var next_page = element.querySelector('#next-page')
      var status    = element.querySelector('#search-pagination-status > span')

      if (this_start_index === 0) {
        prev_page.classList.add('disabled')
      }
      else {
        prev_page.classList.remove('disabled')
      }

      if (next_start_index === results_length) {
        next_page.classList.add('disabled')
      }
      else {
        next_page.classList.remove('disabled')
      }

      if (results_length) {
        status.textContent = page_number + ' of ' + pages
      }
      else {
        status.textContent = ''
      }
    }

    function disable_button_state(element) {
      manage_button_state(element, 0, 0, 0)
    }

    window.FDroid = window.FDroid || {};
    window.FDroid.Search = window.FDroid.Search || {};

    /**
     * @param element DOM Element where the autocomplete is to be appended to.
     * @param templateElement DOM Element for the script tag (with type "x-tmpl-mustache") where the Mustache.js
     *                        template lives.
     * @param baseurl The site.baseurl variable from Jekyll.
     * @param fdroidRepo The site.fdroid-repo variable from Jekyll.
     */
    window.FDroid.Search.addAutocomplete = function(config) {
        loadIndex(config);
    };

})();
