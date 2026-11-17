# ParlorLens tests

Run before every release. Needs Node and Playwright (`PW=/path/to/playwright` if it is not installed locally).

    node tests/gen.js                                    # writes three synthetic .vd6 recordings to tests/rec (not farm data)
    node tests/regress.js /abs/old.html /abs/new.html    # engine output must be identical between two versions
    node tests/scen.js /abs/ParlorLens.html              # real-use scenarios: several recordings, notes, reports, exports, old visit files, phone
    node tests/crawl.js /abs/ParlorLens.html             # every test x every screen: no script errors, no "undefined"/"NaN" text

To compare with the last release: `git show HEAD~1:ParlorLens.html > /tmp/old.html`.
These files are not part of the published site.
