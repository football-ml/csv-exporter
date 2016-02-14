'use strict';

const Table = require('./model/table');
const History = require('./model/history');
const Match = require('./model/match');
const Meta = require('./model/meta');

const logger = require('winston');
const co = require('co');
logger.cli();

class CSVBuilder {
  constructor(io, config) {
    this.io = io;
    this.rounds = io.rounds;
    this.clubCodes = io.clubCodes;
    this.table = new Table(io.clubCodes);
    this.history = new History(io.clubCodes);
    this.clubMeta = io.clubMeta;
    this.meta = new Meta(io.clubMeta);
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

    if (this.config.clubmeta) {
      rowAsJSON.team_value_ratio = this.meta.getTeamMarketValueRatio(homeTeam, awayTeam);
      rowAsJSON.avg_pl_value_ratio = this.meta.getAveragePlayerMarketValueRatio(homeTeam, awayTeam);
      rowAsJSON.a_int_delta = this.meta.getAInternationalsDelta(homeTeam, awayTeam);
    }

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
    return co(function *() {
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
    }.bind(this));
  }
}

module.exports = CSVBuilder;
