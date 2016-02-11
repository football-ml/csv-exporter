'use strict';

const commander = require('commander');
const logger = require('winston');

const co = require('co');

const CSVBuilder = require('./src/csv-builder');
const IO = require('./src/io');
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
  .option('-L, --local [b]', 'Use local data instead of github etc. [default=false]', false)
  .option('-C, --complete [b]', 'Also adds yet unplayed matches to the CSV. [default=false]', false)
  .option('-V, --verbose [b]', 'Also adds verbose data like team code that makes reading data easier for humans. [default=false]', false)
  .option('-T, --tables [b]', 'Print tables. [default=false]', false)
  .parse(process.argv);

const behaviourConf = {
  verbose: commander.verbose,
  exclude: commander.exclude,
  minmatches: commander.minmatches,
  complete: commander.complete,
  tables: commander.tables
};

const ioConf = {
  league: commander.league,
  country: commander.countrycode,
  year: commander.year
};

logger.info('Behaviour Config is', behaviourConf);
logger.info('IO Config is', ioConf);
logger.warn('The first %s matchdays will be ignored in training data due to --minmatches setting', behaviourConf.minmatches);

const start = Date.now();
co(function *() {
  const io = new IO(ioConf);
  yield io.loadData(commander.local);

  const csvBuilder = new CSVBuilder(io.rounds, io.clubCodes, behaviourConf);
  const data = csvBuilder.makeDataForCSVExport();

  io.writeToDiskAsCSV(data);

  return data;
}).then(() => {
  logger.info(`Export took ${Date.now() - start} ms`);
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});
