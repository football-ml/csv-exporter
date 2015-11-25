'use strict';

const commander = require('commander');
const fs = require('fs');
const json2csv = require('json2csv');
const logger = require('winston');

const Table = require('./model/table');
const History = require('./model/history');
const Match = require('./model/match');
logger.cli();

// node src/weka-export.js -f 2015-10-29 -s 2015-11-16 -c 2015-05-04 -V
commander
  .option('-y, --year [s]', 'The year of the season start', '15')
  .option('-c, --countrycode [s]', 'The country code', 'de')
  .option('-l, --league [s]', 'The league', '1')
  .option('-R, --remote [b]', 'Use remote data from fottball.json github repo', false)
  .option('-C, --complete [b]', 'Also adds yet unplayed matches to the CSV. [default=false]', false)
  .option('-V, --verbose [b]', 'Also adds verbose data like team code that makes reading data easier for humans. [default=false]', false)
  .option('-T, --tables [b]', 'Print tables. [default=false]', false)
  .parse(process.argv);

const dataFolderName = '20' + commander.year + '-' + (parseInt(commander.year, 10) + 1);
const resultsDataFileName = commander.countrycode + '.' + commander.league + '.json';
const clubsDataFileName = commander.countrycode + '.' + commander.league + '.clubs.json';

const outputFileName = Date.now() + '_' + dataFolderName;
const resultsPath = '../' + dataFolderName + '/' + resultsDataFileName;
const clubsPath = '../' + dataFolderName + '/' + clubsDataFileName;

const rawResults = require(resultsPath);
const rawClubs = require(clubsPath);
const clubCodes = rawClubs.clubs.map(club => club.code);

const table = new Table(clubCodes);
const history = new History(clubCodes);

const csvData = [];
const rounds = rawResults.rounds;

function toColumn(match) {
  const homeTeam = match.team1.code;
  const awayTeam = match.team2.code;

  const WEIGHT = 1;
  const rowAsJSON = {};

  if (commander.verbose) {
    rowAsJSON.round = match.round;
    rowAsJSON.team_h = homeTeam;
    rowAsJSON.team_a = awayTeam;
  }

  const roundsAgo = [3, 5, 10];
  const formData = history.calculateFormDataForTeamsOfMatch(match, roundsAgo);

  rowAsJSON.team_h_streak_w_3 = history.hasWinningStreakOfNMatches(homeTeam, 3);
  rowAsJSON.team_a_streak_w_3 = history.hasWinningStreakOfNMatches(awayTeam, 3);

  rowAsJSON.team_h_last_w = history.roundsSinceLastWinOfTeam(homeTeam);
  rowAsJSON.team_h_last_dr = history.roundsSinceLastDrawOfTeam(homeTeam);
  rowAsJSON.team_h_last_de = history.roundsSinceLastDefeatOfTeam(homeTeam);
  rowAsJSON.team_a_last_w = history.roundsSinceLastWinOfTeam(awayTeam);
  rowAsJSON.team_a_last_dr = history.roundsSinceLastDrawOfTeam(awayTeam);
  rowAsJSON.team_a_last_de = history.roundsSinceLastDefeatOfTeam(awayTeam);

  rowAsJSON.team_h_win_perc = history.winPercentageOfTeam(homeTeam);
  rowAsJSON.team_h_dra_perc = history.drawPercentageOfTeam(homeTeam);
  rowAsJSON.team_h_def_perc = history.defeatPercentageOfTeam(homeTeam);
  rowAsJSON.team_a_win_perc = history.winPercentageOfTeam(awayTeam);
  rowAsJSON.team_a_dra_perc = history.drawPercentageOfTeam(awayTeam);
  rowAsJSON.team_a_def_perc = history.defeatPercentageOfTeam(awayTeam);

  Object.assign(rowAsJSON, formData);
  rowAsJSON.winner = match.result;

  return rowAsJSON;
}

rounds.map(round => {
  // We don't rely on the correct order if using a regex
  const roundNr = /[a-zA-Z]*([0-9]{1,2})[a-zA-Z]*/.exec(round.name)[1];
  const roundAsInt = parseInt(roundNr, 10);

  round.matches.map(matchData => {
    const match = new Match(matchData, roundAsInt);

    if ((match.hasBeenPlayed || commander.complete) && roundAsInt >= 5) {
      const column = toColumn(match);
      csvData.push(column);
    }

    if (match.hasBeenPlayed) {
      history.addMatch(match);
      table.addMatch(match);
    }
  });

  if (commander.tables) {
    table.printTableForRound(roundAsInt);
  }
});

json2csv({ data: csvData }, function(err, csv) {
  if (err) {
    throw err;
  }

  const file = './output/' + outputFileName + '.csv';

  fs.writeFileSync(file, csv);
  logger.info('Analyzed %s', resultsPath);
  logger.info('CSV created and saved to', file);
});
