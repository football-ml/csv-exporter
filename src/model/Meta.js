'use strict';

const lodash = require('lodash');
const logger = require('winston');
logger.cli();

const TransfermarktProxy = require('../provider/transfermarkt-de');

class Meta {
  constructor(clubMeta, roundMeta) {
    this.clubMeta = clubMeta;
    this.roundMeta = roundMeta;

    if (!this.isMeaningfulData) {
      logger.warn('Club meta data is not meaningful. this will distort the result');
    }
  }

  getRawMetaForRoundAndTeams(round, teams) {
    const roundMeta = this.roundMeta[round];
    return lodash.find(roundMeta, { homeTeam: teams.home, awayTeam: teams.away });
  }

  calculateMetaForTeams(teams) {
    return {
      team_value_ratio: this.getTeamMarketValueRatio(teams),
      avg_pl_value_ratio: this.getAveragePlayerMarketValueRatio(teams),
      a_int_delta: this.getAInternationalsDelta(teams)
    };
  }

  calculateMetaForMatch(match) {
    const meta = this.getRawMetaForRoundAndTeams(match.round, match.teams);

    const predictions = [
      { p: meta.tmWinHomeUserProb, predictedWinner: 'H' },
      { p: meta.tmRemisUserProb, predictedWinner: 'X' },
      { p: meta.tmWinAwayUserProb, predictedWinner: 'A' }
    ];

    const highestProb = lodash.maxBy(predictions, pred => pred.p);

    return {
      tm_pred: highestProb.predictedWinner,
      tm_pred_p: lodash.round(highestProb.p, 2)
    };
  }

  get isMeaningfulData() {
    return lodash.every(this.clubMeta, val => Object.keys(val).length > 0);
  }

  getTeamValue(team) {
    return this.clubMeta[team].teamMarketValue;
  }

  getAveragePlayerMarketValue(team) {
    return this.clubMeta[team].averagePlayerMarketValue;
  }

  getNumberOfAInternationals(team) {
    return this.clubMeta[team].aInternationals;
  }

  getTeamMarketValueRatio(teams) {
    return lodash.round(this.getTeamValue(teams.home) / this.getTeamValue(teams.away), 2);
  }

  getAveragePlayerMarketValueRatio(teams) {
    return lodash.round(this.getAveragePlayerMarketValue(teams.home) / this.getAveragePlayerMarketValue(teams.away), 2);
  }

  getAInternationalsDelta(teams) {
    return this.getNumberOfAInternationals(teams.home) - this.getNumberOfAInternationals(teams.away);
  }

  static getMetaForMatchDay(country, league, season, matchday) {
    const result = TransfermarktProxy.getMatchdayInfo(country, league, season, matchday);
    return result;
  }

  static getMetaForMatchDays(country, league, season, start, end) {
    const allMatchdays = {};
    for (let i = start; i <= end; i++) {
      allMatchdays[i] = TransfermarktProxy.getMatchdayInfo(country, league, season, i);
    }

    return allMatchdays;
  }
}

module.exports = Meta;
