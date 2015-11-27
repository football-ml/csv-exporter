'use strict';

const lodash = require('lodash');

class History {
  constructor(allTeamsInLeague) {
    this.history = {};
    allTeamsInLeague.map(team => {
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
    this.history[match.homeTeam].homeHistory.push('W');
    this.history[match.homeTeam].allHistory.push('W');
    this.history[match.awayTeam].awayHistory.push('L');
    this.history[match.awayTeam].allHistory.push('L');
    this.history[match.homeTeam].lastWin = match.round;
    this.history[match.awayTeam].lastDefeat = match.round;

    this.history[match.homeTeam].numberOfWins += 1;
    this.history[match.homeTeam].numberOfHomeWins += 1;

    this.history[match.awayTeam].numberOfDefeats += 1;
    this.history[match.awayTeam].numberOfAwayDefeats += 1;
  }

  addMatchWithDraw(match) {
    this.history[match.homeTeam].homeHistory.push('X');
    this.history[match.homeTeam].allHistory.push('X');
    this.history[match.awayTeam].awayHistory.push('X');
    this.history[match.awayTeam].allHistory.push('X');
    this.history[match.homeTeam].lastDraw = match.round;
    this.history[match.awayTeam].lastDraw = match.round;

    this.history[match.homeTeam].numberOfDraws += 1;
    this.history[match.homeTeam].numberOfHomeDraws += 1;

    this.history[match.awayTeam].numberOfDraws += 1;
    this.history[match.awayTeam].numberOfAwayDraws += 1;
  }

  addMatchWithAwayTeamWin(match) {
    this.history[match.homeTeam].homeHistory.push('L');
    this.history[match.homeTeam].allHistory.push('L');
    this.history[match.awayTeam].awayHistory.push('W');
    this.history[match.awayTeam].allHistory.push('W');
    this.history[match.homeTeam].lastDefeat = match.round;
    this.history[match.awayTeam].lastWin = match.round;

    this.history[match.homeTeam].numberOfDefeats += 1;
    this.history[match.homeTeam].numberOfHomeDefeats += 1;

    this.history[match.awayTeam].numberOfWins += 1;
    this.history[match.awayTeam].numberOfAwayWins += 1;
  }

  addMatch(match) {
    this.history[match.homeTeam].round = match.round;
    this.history[match.awayTeam].round = match.round;

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

  getLastPlayedRoundOfTeam(team) {
    return this.history[team].round;
  }

  getWinPercentageOfTeam(team) {
    const exactPercentage = this.history[team].numberOfWins / this.getLastPlayedRoundOfTeam(team);
    return lodash.round(exactPercentage, 2);
  }

  getDrawPercentageOfTeam(team) {
    const exactPercentage = this.history[team].numberOfDraws / this.getLastPlayedRoundOfTeam(team);
    return lodash.round(exactPercentage, 2);
  }

  getDefeatPercentageOfTeam(team) {
    const exactPercentage = this.history[team].numberOfDefeats / this.getLastPlayedRoundOfTeam(team);
    return lodash.round(exactPercentage, 2);
  }

  getRoundsSinceLastWinOfTeam(team) {
    return (this.history[team].round - this.history[team].lastWin) + 1;
  }

  getRoundsSinceLastDrawOfTeam(team) {
    return (this.history[team].round - this.history[team].lastDraw) + 1;
  }

  getRoundsSinceLastDefeatOfTeam(team) {
    return (this.history[team].round - this.history[team].lastDefeat) + 1;
  }

  getWinningStreakLength(team, n) {
    const allMatches = this.history[team].allHistory;
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

  calculateTeamFormForLastNMatches(team, n, weight /* = 1*/) {
    const allMatches = this.history[team].allHistory;
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

  calculateFormDeltaForLastNMatches(teams, n, weight /* = 1*/) {
    const form1 = this.calculateTeamFormForLastNMatches(teams.home, n, weight);
    const form2 = this.calculateTeamFormForLastNMatches(teams.away, n, weight);

    return form1 - form2;
  }

  calculateRoundsSinceResultsForTeams(teams) {
    const rowAsJSON = {};

    rowAsJSON.team_h_last_w = this.getRoundsSinceLastWinOfTeam(teams.home);
    rowAsJSON.team_h_last_dr = this.getRoundsSinceLastDrawOfTeam(teams.home);
    rowAsJSON.team_h_last_de = this.getRoundsSinceLastDefeatOfTeam(teams.home);
    rowAsJSON.team_a_last_w = this.getRoundsSinceLastWinOfTeam(teams.away);
    rowAsJSON.team_a_last_dr = this.getRoundsSinceLastDrawOfTeam(teams.away);
    rowAsJSON.team_a_last_de = this.getRoundsSinceLastDefeatOfTeam(teams.away);

    return rowAsJSON;
  }

  calculatePercentageOfResultsAfterForTeams(teams) {
    const rowAsJSON = {};

    rowAsJSON.team_h_win_perc = this.getWinPercentageOfTeam(teams.home);
    rowAsJSON.team_h_dra_perc = this.getDrawPercentageOfTeam(teams.home);
    rowAsJSON.team_h_def_perc = this.getDefeatPercentageOfTeam(teams.home);
    rowAsJSON.team_a_win_perc = this.getWinPercentageOfTeam(teams.away);
    rowAsJSON.team_a_dra_perc = this.getDrawPercentageOfTeam(teams.away);
    rowAsJSON.team_a_def_perc = this.getDefeatPercentageOfTeam(teams.away);

    return rowAsJSON;
  }

  calculateWinningStreaksForTeams(teams, roundsAgo) {
    const rowAsJSON = {};

    rowAsJSON['team_h_streak_w_' + roundsAgo] = this.getWinningStreakLength(teams.home, roundsAgo);
    rowAsJSON['team_a_streak_w_' + roundsAgo] = this.getWinningStreakLength(teams.away, roundsAgo);

    return roundsAgo;
  }

  calculateFormDataForTeams(teams, roundsAgo) {
    const WEIGHT = 1;

    const formData = {};

    roundsAgo.map(ago => {
      formData['team_h_form_last_' + ago] = this.calculateTeamFormForLastNMatches(teams.home, ago, WEIGHT);
      formData['team_a_form_last_' + ago] = this.calculateTeamFormForLastNMatches(teams.away, ago, WEIGHT);
      formData['form_delta_last_' + ago] = this.calculateFormDeltaForLastNMatches(teams, ago, WEIGHT);
    });

    return formData;
  }
}

module.exports = History;
