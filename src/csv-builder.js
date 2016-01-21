'use strict';

const Table = require('./model/table');
const History = require('./model/history');
const Match = require('./model/match');

const logger = require('winston');
logger.cli();

class CSVBuilder {
  constructor(rounds, clubCodes, config) {
    this.rounds = rounds;
    this.clubCodes = clubCodes;
    this.table = new Table(clubCodes);
    this.history = new History(clubCodes);
    this.config = config;
    this.csvData = [];
    this.exclude = config.exclude;
  }

  filterExcluded(rowAsJSON) {
    this.exclude.map(exclude => {
      delete rowAsJSON[exclude];
    });

    return rowAsJSON;
  }

  matchToDataRow(match) {
    const homeTeam = match.team1.code;
    const awayTeam = match.team2.code;

    const rowAsJSON = {};

    if (this.config.verbose) {
      rowAsJSON.round = match.round;
      rowAsJSON.team_h = homeTeam;
      rowAsJSON.team_a = awayTeam;
    }

    const formData = this.history.calculateFormDataForTeams(match.teams, [3, 5, 10]);
    const winningStreaks = this.history.calculateWinningStreaksForTeams(match.teams, 3);
    const roundsSinceResult = this.history.calculateRoundsSinceResultsForTeams(match.teams);
    const resultsPercentages = this.history.calculatePercentageOfResultsAfterForTeams(match.teams);

    Object.assign(rowAsJSON, formData, winningStreaks, roundsSinceResult, resultsPercentages);

    rowAsJSON.winner = match.result;

    return rowAsJSON;
  }

  makeDataForCSVExport() {
    const self = this;
    this.rounds.map(round => {
      // We don't rely on the correct order if using a regex
      const roundNr = /[a-zA-Z]*([0-9]{1,2})[a-zA-Z]*/.exec(round.name)[1];
      const roundAsInt = parseInt(roundNr, 10);

      const expectedNumberOfMatches = this.clubCodes.length / 2;
      const actualMatches = round.matches.length;

      if (actualMatches !== expectedNumberOfMatches) {
        logger.error('A match seems to be missing in round %s (%s <-> %s)', roundNr, actualMatches, expectedNumberOfMatches);
      }

      round.matches.map(matchData => {
        const match = new Match(matchData, roundAsInt);

        if ((match.hasBeenPlayed || self.config.complete) && roundAsInt >= self.config.minmatches) {
          const row = self.matchToDataRow(match);
          self.filterExcluded(row);
          self.csvData.push(row);
        }

        if (match.hasBeenPlayed) {
          self.history.addMatch(match);
          self.table.addMatch(match);
        }
      });

      if (self.config.tables) {
        self.table.printTableForRound(roundAsInt);
      }
    });

    return self.csvData;
  }
}

module.exports = CSVBuilder;