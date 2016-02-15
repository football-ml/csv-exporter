'use strict';

const commander = require('commander');
const logger = require('winston');

const co = require('co');

const CSVBuilder = require('./src/csv-builder');
const DataPool = require('./src/data-pool');
logger.cli();

function toInt(year) {
  return parseInt(year, 10);
}

function list(excludes) {
  return excludes.split(';');
}

commander
  .option('-y, --year [n]', 'The year of the season start in YY, i.e. 14 [default=15]', toInt, 15)
  .option('-c, --countrycode [s]', 'The country code, i.e. de, es, en, it [default=de]', 'de')
  .option('-l, --league [s]', 'The league, i.e. 1 for Premier League, Serie A, 1. Bundesliga,.. [default=1]', '1')
  .option('-e, --exclude [s]', 'Excludes a certain attribute from the generated CSV, i.e. "form_delta_last_3;team_h_form_last_5" [default=[]]', list, [])
  .option('-m, --minmatches [n]', 'The minimum number of matches that have to be played before a match is considered for the training data [default=5]', toInt, 5)
  .option('-M, --clubmeta [b]', 'NOTE: Currently only supported for (de,15,1). Crawls club meta data (marketValue..) and adds it to the data set. Decreases processing speed [default=false]', false)
  .option('-L, --local [b]', 'Use local data instead of github etc. [default=false]', false)
  .option('-C, --complete [b]', 'Also adds yet unplayed matches to the CSV. [default=false]', false)
  .option('-V, --verbose [b]', 'Also adds verbose data like team code that makes reading data easier for humans. [default=false]', false)
  .option('-T, --tables [b]', 'Print tables. [default=false]', false)
  .parse(process.argv);

const exporterConfig = {
  verbose: commander.verbose,
  exclude: commander.exclude,
  minmatches: commander.minmatches,
  clubmeta: commander.clubmeta,
  complete: commander.complete,
  tables: commander.tables
};

const dataPoolConfig = {
  league: commander.league,
  country: commander.countrycode,
  year: commander.year
};

logger.info('Behaviour Config is', exporterConfig);
logger.info('DataPool Config is', dataPoolConfig);
logger.warn('The first %s matchdays will be ignored in training data due to --minmatches setting', exporterConfig.minmatches);

const start = Date.now();
co(function *() {
  const datapool = new DataPool(dataPoolConfig);
  const fixturesData = yield datapool.loadClubAndMatchData(commander.local);
  logger.info('Got league fixtures, clubs and results from %s', commander.local ? 'Local File' : 'github.com/openfootball/football.json');

  const clubCodes = DataPool.toClubCodes(fixturesData.clubs);

  let clubMeta = {};

  // Optional until all transfermarkt.de id mappings are created. Currently only for (de, 1, 2015)
  if (exporterConfig.clubmeta) {
    clubMeta = yield datapool.loadClubMeta(clubCodes);
    logger.info('Got club metadata from transfermarkt.de for %s clubs', Object.keys(clubMeta).length);
  }

  const roundMeta = yield datapool.loadRoundMeta(1, 10);
  logger.info('Got round metadata from transfermarkt.de for %s rounds', Object.keys(roundMeta).length);

  const csvBuilder = new CSVBuilder(fixturesData.clubs, fixturesData.rounds, clubMeta, roundMeta, exporterConfig);
  const CSVData = yield csvBuilder.makeDataForCSVExport();

  datapool.writeToDiskAsCSV(CSVData);

  return CSVData;
}).then(() => {
  logger.info(`Export took ${Date.now() - start} ms`);
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});
