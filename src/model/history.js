'use strict';

const lodash = require('lodash');

class History {
  constructor(teams) {
    this.history = {};
    teams.map(team => {
      this.history[team] = {
        round: 0,
        homeHistory: [],
        awayHistory: [],
        allHistory: [],
        lastWin: -1,
        lastDraw: -1,
        lastDefeat: -1,
        numberOfWins: 0,
        numberOfHomeWins: 0,
        numberOfAwayWins: 0,
        numberOfDraws: 0,
        numberOfAwayDraws: 0,
        numberOfHomeDraws: 0,
        numberOfDefeats: 0,
        numberOfHomeDefeats: 0,
        numberOfAwayDefeats: 0
      };
    });
  }

  addMatchWithHomeTeamWin(match) {
    const homeTeamCode = match.team1.code;
    const awayTeamCode = match.team2.code;

    this.history[homeTeamCode].homeHistory.push('W');
    this.history[homeTeamCode].allHistory.push('W');
    this.history[awayTeamCode].awayHistory.push('L');
    this.history[awayTeamCode].allHistory.push('L');
    this.history[homeTeamCode].lastWin = match.round;
    this.history[awayTeamCode].lastDefeat = match.round;

    this.history[homeTeamCode].numberOfWins += 1;
    this.history[homeTeamCode].numberOfHomeWins += 1;

    this.history[awayTeamCode].numberOfDefeats += 1;
    this.history[awayTeamCode].numberOfAwayDefeats += 1;
  }

  addMatchWithDraw(match) {
    const homeTeamCode = match.team1.code;
    const awayTeamCode = match.team2.code;

    this.history[homeTeamCode].homeHistory.push('X');
    this.history[homeTeamCode].allHistory.push('X');
    this.history[awayTeamCode].awayHistory.push('X');
    this.history[awayTeamCode].allHistory.push('X');
    this.history[homeTeamCode].lastDraw = match.round;
    this.history[awayTeamCode].lastDraw = match.round;

    this.history[homeTeamCode].numberOfDraws += 1;
    this.history[homeTeamCode].numberOfHomeDraws += 1;

    this.history[awayTeamCode].numberOfDraws += 1;
    this.history[awayTeamCode].numberOfAwayDraws += 1;
  }

  addMatchWithAwayTeamWin(match) {
    const homeTeamCode = match.team1.code;
    const awayTeamCode = match.team2.code;

    this.history[homeTeamCode].homeHistory.push('L');
    this.history[homeTeamCode].allHistory.push('L');
    this.history[awayTeamCode].awayHistory.push('W');
    this.history[awayTeamCode].allHistory.push('W');
    this.history[homeTeamCode].lastDefeat = match.round;
    this.history[awayTeamCode].lastWin = match.round;

    this.history[homeTeamCode].numberOfDefeats += 1;
    this.history[homeTeamCode].numberOfHomeDefeats += 1;

    this.history[awayTeamCode].numberOfWins += 1;
    this.history[awayTeamCode].numberOfAwayWins += 1;
  }

  addMatch(match) {
    const homeTeamCode = match.team1.code;
    const awayTeamCode = match.team2.code;

    this.history[homeTeamCode].round = match.round;
    this.history[awayTeamCode].round = match.round;

    if (match.isHomeTeamWin) {
      this.addMatchWithHomeTeamWin(match);
    }

    if (match.isDraw) {
      this.addMatchWithDraw(match);
    }

    if (match.isAwayTeamWin) {
      this.addMatchWithAwayTeamWin(match);
    }
  }

  lastPlayedRoundOfTeam(team) {
    return this.history[team].round;
  }

  winPercentageOfTeam(team) {
    const exactPercentage = this.history[team].numberOfWins / this.lastPlayedRoundOfTeam(team);
    return lodash.round(exactPercentage, 2);
  }

  drawPercentageOfTeam(team) {
    const exactPercentage = this.history[team].numberOfDraws / this.lastPlayedRoundOfTeam(team);
    return lodash.round(exactPercentage, 2);
  }

  defeatPercentageOfTeam(team) {
    const exactPercentage = this.history[team].numberOfDefeats / this.lastPlayedRoundOfTeam(team);
    return lodash.round(exactPercentage, 2);
  }

  roundsSinceLastWinOfTeam(team) {
    return (this.history[team].round - this.history[team].lastWin) + 1;
  }

  roundsSinceLastDrawOfTeam(team) {
    return (this.history[team].round - this.history[team].lastDraw) + 1;
  }

  roundsSinceLastDefeatOfTeam(team) {
    return (this.history[team].round - this.history[team].lastDefeat) + 1;
  }

  hasWinningStreakOfNMatches(teamCode, n) {
    const allMatches = this.history[teamCode].allHistory;
    const relevantMatches = lodash.takeRight(allMatches, n);

    return relevantMatches.reduce((start, result) => {
      switch (result) {
      case 'W':
        return start && true;
      default:
        return start && false;
      }
    }, true);
  }

  calculateTeamFormForLastNMatches(teamCode, n, weight /* = 1*/) {
    const allMatches = this.history[teamCode].allHistory;
    const relevantMatches = lodash.takeRight(allMatches, n);

    return relevantMatches.reduce((start, result) => {
      switch (result) {
      case 'W':
        return start + weight;
      case 'L':
        return start - weight;
      default:
        return start;
      }
    }, n);
  }

  calculateFormDeltaForLastNMatches(teamCode1, teamCode2, n, weight /* = 1*/) {
    const form1 = this.calculateTeamFormForLastNMatches(teamCode1, n, weight);
    const form2 = this.calculateTeamFormForLastNMatches(teamCode2, n, weight);

    return form1 - form2;
  }

  calculateFormDataForTeamsOfMatch(match, roundsAgo) {
    const homeTeam = match.team1.code;
    const awayTeam = match.team2.code;
    const WEIGHT = 1;

    const formData = {};

    roundsAgo.map(ago => {
      formData['team_h_form_last_' + ago] = this.calculateTeamFormForLastNMatches(homeTeam, ago, WEIGHT);
      formData['team_a_form_last_' + ago] = this.calculateTeamFormForLastNMatches(awayTeam, ago, WEIGHT);
      formData['form_delta_last_' + ago] = this.calculateFormDeltaForLastNMatches(homeTeam, awayTeam, ago, WEIGHT);
    });

    return formData;
  }
}

module.exports = History;
