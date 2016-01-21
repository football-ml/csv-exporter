# football-ml

A set of various tools to create and process data sets of football results with Machine Learning and Predictive Analytics

``
node index.js -help

  Usage: index [options]

  Options:

    -h, --help             output usage information
    -y, --year [n]         The year of the season start in YY, i.e. 14 [default=15]
    -c, --countrycode [s]  The country code, i.e. de, es, en, it [default=de]
    -l, --league [s]       The league, i.e. 1 for Premier League, Serie A, 1. Bundesliga,.. [default=1]
    -L, --local [b]        Use local data instead of github etc. [default=false]
    -C, --complete [b]     Also adds yet unplayed matches to the CSV. [default=false]
    -V, --verbose [b]      Also adds verbose data like team code that makes reading data easier for humans. [default=false]
    -T, --tables [b]       Print tables. [default=false]

```
`