### [fdroid-search](https://github.com/warren-bank/fdroid-search)

#### Hosted:

[fdroid-search.html](http://warren-bank.github.io/fdroid-search/fdroid-search.html)

#### Background:

* [f-droid.org](https://f-droid.org/) has recently revamped their website
* the old server-side search was removed
* it was replaced with a client-side search widget that uses a [pre-build Lunr index](https://lunrjs.com/guides/index_prebuilding.html)
* this search widget lives in the sidebar and displays a flyout list of search results as the user types into an input field
* a maximum of 10 search results are shown

#### Description:

* using the same Lunr index and search widget,<br>add pagination to display all search results

#### Caveat:

* the search results are only as good as the Lunr index
* I've noticed a lot of missing packages that should occur in the results.. but don't
* this project uses the Lunr index on f-droid's staging server,<br>so the search results should improve as this index gets better

#### Related Links:

* [git repo: "fdroid-website"](https://gitlab.com/fdroid/fdroid-website)
  * Jekyll page to power [f-droid.org](https://f-droid.org) and its [staging server](https://fdroid.gitlab.io/fdroid-website/)
* [git repo: "jekyll-fdroid"](https://gitlab.com/fdroid/jekyll-fdroid)
  * Jekyll plugin to work with F-Droid package index metadata

#### Related User Questions/Comments:

* [forum: "How do I search on f-droid.org from now on?"](https://forum.f-droid.org/t/how-do-i-search-on-f-droid-org-from-now-on/711)
* [issue #105: "Allow to open search result item in new tab / bring back the old search"](https://gitlab.com/fdroid/fdroid-website/issues/105)
* [issue #109: "Bring the old webpage back"](https://gitlab.com/fdroid/fdroid-website/issues/109)
