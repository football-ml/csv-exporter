'use strict';

var commander = require('commander');
var lodash = require('lodash');
var async = require('async');
var fs = require('fs');
var GendrFactory = require('gendr');
var Strategies = GendrFactory.Strategies;
var json2csv = require('json2csv');
var moment = require('moment');
var logger = require('winston');
logger.cli();

//node src/weka-export.js -f 2015-10-29 -s 2015-11-16 -c 2015-05-04 -V

commander
  .option('-y, --year [s]', 'The year of the season start', '15')
  .option('-c, --countrycode [s]', 'The country code', 'de')
  .option('-l, --league [s]', 'The league', '1')
  .option('-C, --complete [b]', 'Also adds yet unplayed matches to the CSV. [default=false]', false)
  .parse(process.argv);

var dataFolderName = '20' + commander.year + '-' + (parseInt(commander.year) + 1);
var resultsDataFileName = commander.countrycode + '.' + commander.league + '.json';
var clubsDataFileName = commander.countrycode + '.' + commander.league + '.clubs.json';

var outputFileName = dataFolderName + '_' + Date.now();
var resultsPath = '../' + dataFolderName + '/' + resultsDataFileName;
var clubsPath = '../' + dataFolderName + '/' + clubsDataFileName;

var rawResults = require(resultsPath);
var rawClubs = require(clubsPath);

var aggregatedDataPerTeam = {};

rawClubs.clubs.map(club => aggregatedDataPerTeam[club.code] = {
  round: 0,
  homeHistory: [],
  awayHistory: [],
  allHistory: [],
  lastWin: 1,
  lastDraw: 1,
  lastDefeat: 1,
  numberOfWins: 0,
  numberOfHomeWins: 0,
  numberOfAwayWins: 0,
  numberOfDraws: 0,
  numberOfAwayDraws: 0,
  numberOfHomeDraws: 0,
  numberOfDefeats: 0,
  numberOfHomeDefeats: 0,
  numberOfAwayDefeats: 0
});

var csvData = [];

var rounds = rawResults.rounds;
const HOME_TEAM_WIN = 'H';
const AWAY_TEAM_WIN = 'A';
const DRAW = 'X';

function updateHistoryForTeams(match, roundNr) {
  var homeTeamCode = match.team1.code;
  var awayTeamCode = match.team2.code;

  aggregatedDataPerTeam[homeTeamCode].round = roundNr;
  aggregatedDataPerTeam[awayTeamCode].round = roundNr;

  var winner = getResultOfMatch(match);

  if (winner === HOME_TEAM_WIN) {
    aggregatedDataPerTeam[homeTeamCode].homeHistory.push('W');
    aggregatedDataPerTeam[homeTeamCode].allHistory.push('W');
    aggregatedDataPerTeam[awayTeamCode].awayHistory.push('L');
    aggregatedDataPerTeam[awayTeamCode].allHistory.push('L');
    aggregatedDataPerTeam[homeTeamCode].lastWin = roundNr;
    aggregatedDataPerTeam[awayTeamCode].lastDefeat = roundNr;

    aggregatedDataPerTeam[homeTeamCode].numberOfWins += 1;
    aggregatedDataPerTeam[homeTeamCode].numberOfHomeWins += 1;

    aggregatedDataPerTeam[awayTeamCode].numberOfDefeats += 1;
    aggregatedDataPerTeam[awayTeamCode].numberOfAwayDefeats += 1;

  }

  if (winner === DRAW) {
    aggregatedDataPerTeam[homeTeamCode].homeHistory.push('X');
    aggregatedDataPerTeam[homeTeamCode].allHistory.push('X');
    aggregatedDataPerTeam[awayTeamCode].awayHistory.push('X');
    aggregatedDataPerTeam[awayTeamCode].allHistory.push('X');
    aggregatedDataPerTeam[homeTeamCode].lastDraw = roundNr;
    aggregatedDataPerTeam[awayTeamCode].lastDraw = roundNr;

    aggregatedDataPerTeam[homeTeamCode].numberOfDraws += 1;
    aggregatedDataPerTeam[homeTeamCode].numberOfHomeDraws += 1;

    aggregatedDataPerTeam[awayTeamCode].numberOfDraws += 1;
    aggregatedDataPerTeam[awayTeamCode].numberOfAwayDraws += 1;
  }

  if (winner === AWAY_TEAM_WIN) {
    aggregatedDataPerTeam[homeTeamCode].homeHistory.push('L');
    aggregatedDataPerTeam[homeTeamCode].allHistory.push('L');
    aggregatedDataPerTeam[awayTeamCode].awayHistory.push('W');
    aggregatedDataPerTeam[awayTeamCode].allHistory.push('W');
    aggregatedDataPerTeam[homeTeamCode].lastDefeat = roundNr;
    aggregatedDataPerTeam[awayTeamCode].lastWin = roundNr;

    aggregatedDataPerTeam[homeTeamCode].numberOfDefeats += 1;
    aggregatedDataPerTeam[homeTeamCode].numberOfHomeDefeats += 1;

    aggregatedDataPerTeam[awayTeamCode].numberOfWins += 1;
    aggregatedDataPerTeam[awayTeamCode].numberOfAwayWins += 1;
  }
}

function getResultOfMatch(match) {
  return match.score1 > match.score2 ? HOME_TEAM_WIN
    : (match.score1 < match.score2 ? AWAY_TEAM_WIN : DRAW);
}

function toColumn(match, roundNr) {
  var winner = getResultOfMatch(match);
  var homeTeamCode = match.team1.code;
  var awayTeamCode = match.team2.code;

  var roundsSinceLastWinOfHomeTeam = roundNr - aggregatedDataPerTeam[homeTeamCode].lastWin;
  var roundsSinceLastDrawOfHomeTeam = roundNr - aggregatedDataPerTeam[homeTeamCode].lastDraw;
  var roundsSinceLastDefeatOfHomeTeam = roundNr - aggregatedDataPerTeam[homeTeamCode].lastDefeat;

  var roundsSinceLastWinOfAwayTeam = roundNr - aggregatedDataPerTeam[awayTeamCode].lastWin;
  var roundsSinceLastDrawOfAwayTeam = roundNr - aggregatedDataPerTeam[awayTeamCode].lastDraw;
  var roundsSinceLastDefeatOfAwayTeam = roundNr - aggregatedDataPerTeam[awayTeamCode].lastDefeat;

  var matchEntry = {
    //round: roundNr,
    //team_h: homeTeamCode,
    //team_a: awayTeamCode,

    team_h_last_w: roundsSinceLastWinOfHomeTeam,
    team_h_last_dr: roundsSinceLastDrawOfHomeTeam,
    team_h_last_de: roundsSinceLastDefeatOfHomeTeam,
    team_a_last_w: roundsSinceLastWinOfAwayTeam,
    team_a_last_dr: roundsSinceLastDrawOfAwayTeam,
    team_a_last_de: roundsSinceLastDefeatOfAwayTeam,

    team_h_win_perc: aggregatedDataPerTeam[homeTeamCode].numberOfWins / aggregatedDataPerTeam[homeTeamCode].round,
    team_h_dra_perc: aggregatedDataPerTeam[homeTeamCode].numberOfDraws / aggregatedDataPerTeam[homeTeamCode].round,
    team_h_def_perc: aggregatedDataPerTeam[homeTeamCode].numberOfDefeats / aggregatedDataPerTeam[homeTeamCode].round,
    team_a_win_perc: aggregatedDataPerTeam[awayTeamCode].numberOfWins / aggregatedDataPerTeam[awayTeamCode].round,
    team_a_dra_perc: aggregatedDataPerTeam[awayTeamCode].numberOfDraws / aggregatedDataPerTeam[awayTeamCode].round,
    team_a_def_perc: aggregatedDataPerTeam[awayTeamCode].numberOfDefeats / aggregatedDataPerTeam[awayTeamCode].round,

    winner: winner
  };

  return matchEntry;
}

rounds.map(round => {
  //We don't rely on the correct order if useing a regex
  var roundNr = /[a-zA-Z]*([0-9]{1,2})[a-zA-Z]*/.exec(round.name)[1];

  round.matches.map(match => {
    var winner = null;
    var matchHasAlreadyBeenPlayed = match.score1 !== null && match.score2 !== null;

    if ((matchHasAlreadyBeenPlayed || commander.complete) && roundNr >= 5) {
      var column = toColumn(match, roundNr);
      csvData.push(column);
    }

    if (matchHasAlreadyBeenPlayed) {
      updateHistoryForTeams(match, roundNr);
    }
  })
});

json2csv({ data: csvData }, function(err, csv) {
  if (err) {
    throw err;
  }

  var file = './output/' + outputFileName + '.csv';

  fs.writeFileSync(file, csv);
  logger.info('Analyzed %s', resultsPath);
  logger.info('CSV created and saved to', file);
});
