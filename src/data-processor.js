'use strict';

const Table = require('./model/table');
const History = require('./model/history');
const Match = require('./model/match');
const Meta = require('./model/meta');

const logger = require('winston');
const lodash = require('lodash');
logger.cli();

class DataProcessor {
  constructor(clubs, rounds, clubMeta, roundMeta, lastPlayedRound, config) {
    this.clubs = clubs;
    this.clubCodes = clubs.map(club => club.code);
    this.rounds = rounds;

    this.clubMeta = clubMeta;
    this.roundMeta = roundMeta;

    this.lastPlayedRound = lastPlayedRound;

    this.config = config;

    this.meta = new Meta(clubMeta, roundMeta);
    this.table = new Table(this.clubCodes);
    this.history = new History(this.clubCodes);

    this.trainingData = [];
    this.testData = [];
    this.csvData = [];
    this.exclude = config.exclude;
  }

  filterExcluded(rowAsJSON) {
    this.exclude.map(exclude => {
      delete rowAsJSON[exclude];
    });

    return rowAsJSON;
  }

  static lastCompletelyFinishedRound(rounds) {
    for (const round of rounds) {
      const roundNr = DataProcessor.textualDescriptionToRoundNumber(round);
      const completelyFinished = lodash.every(round.matches, matchData => matchData.score1 !== null && matchData.score2 !== null);

      if (!completelyFinished) {
        return roundNr - 1;
      }
    }

    return -1;
  }

  matchToDataRow(match) {
    const rowAsJSON = {};

    if (this.config.verbose) {
      rowAsJSON.round = match.round;
      rowAsJSON.team_h = match.teams.home;
      rowAsJSON.team_a = match.teams.away;
    }

    const roundsSinceResult = this.history.calculateRoundsSinceResultsForTeams(match.teams);
    const winningStreaks = this.history.calculateWinningStreaksForTeams(match.teams, 3);
    const formData = this.history.calculateFormDataForTeams(match.teams, [3, 5, 10]);
    const resultsPercentages = this.history.calculatePercentageOfResultsAfterForTeams(match.teams);
    const roundMeta = this.meta.calculateMetaForMatch(match);

    Object.assign(rowAsJSON, roundsSinceResult, winningStreaks, formData, resultsPercentages, roundMeta);

    if (this.config.clubmeta) {
      const teamMeta = this.meta.calculateMetaForTeams(match.teams);
      Object.assign(rowAsJSON, teamMeta);
    }

    rowAsJSON.winner = match.result;

    return rowAsJSON;
  }

  makeData() {
    const self = this;

    this.rounds.map(round => {
      const roundAsInt = DataProcessor.textualDescriptionToRoundNumber(round);

      const expectedNumberOfMatches = this.clubCodes.length / 2;
      const actualMatches = round.matches.length;

      if (actualMatches !== expectedNumberOfMatches) {
        logger.error('A match seems to be missing in round %s (%s <-> %s)', roundAsInt, actualMatches, expectedNumberOfMatches);
      }

      round.matches.map(matchData => {
        const match = new Match(matchData, roundAsInt);
        const isRowForTestData = roundAsInt === this.lastPlayedRound + 1;
        const enoughMatchesPlayedToCreateMeaningfulData = roundAsInt >= self.config.minmatches;

        if ((match.hasBeenPlayed || self.config.complete || isRowForTestData) && enoughMatchesPlayedToCreateMeaningfulData) {
          const row = self.matchToDataRow(match);
          self.filterExcluded(row);
          if (isRowForTestData) {
            self.testData.push(row);
          } else {
            self.trainingData.push(row);
          }
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

    return {
      trainingData: this.trainingData,
      testData: this.testData
    };
  }

  static textualDescriptionToRoundNumber(round) {
// We don't rely on the correct order if using a regex
    const roundNr = /[a-zA-Z]*([0-9]{1,2})[a-zA-Z]*/.exec(round.name)[1];
    return parseInt(roundNr, 10);
  }
}

module.exports = DataProcessor;
