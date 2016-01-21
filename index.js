'use strict';

const commander = require('commander');
const logger = require('winston');

const CSVBuilder = require('./src/csv-builder');
const IO = require('./src/io');
logger.cli();

function getYear(year) {
  return parseInt(year, 10);
}

function list(excludes) {
  return excludes.split(';');
}

commander
  .option('-y, --year [n]', 'The year of the season start in YY, i.e. 14 [default=15]', getYear, 15)
  .option('-c, --countrycode [s]', 'The country code, i.e. de, es, en, it [default=de]', 'de')
  .option('-l, --league [s]', 'The league, i.e. 1 for Premier League, Serie A, 1. Bundesliga,.. [default=1]', '1')
  .option('-e, --exclude [s]', 'Excludes a certain attribute from the generated CSV, i.e. "form_delta_last_3;team_h_form_last_5" [default=[]]', list, [])
  .option('-L, --local [b]', 'Use local data instead of github etc. [default=false]', false)
  .option('-C, --complete [b]', 'Also adds yet unplayed matches to the CSV. [default=false]', false)
  .option('-V, --verbose [b]', 'Also adds verbose data like team code that makes reading data easier for humans. [default=false]', false)
  .option('-T, --tables [b]', 'Print tables. [default=false]', false)
  .parse(process.argv);

const behaviourConf = {
  verbose: commander.verbose,
  exclude: commander.exclude,
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

const io = new IO(ioConf);
io.loadData(commander.local, function() {
  const csvBuilder = new CSVBuilder(io.rounds, io.clubCodes, behaviourConf);

  try {
    const data = csvBuilder.makeDataForCSVExport();
    io.writeToDiskAsCSV(data);
  } catch (e) {
    logger.error(e.message);
  } finally {
    process.exit(0);
  }
});
