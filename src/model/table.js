'use strict';

const lodash = require('lodash');

class Table {
  constructor(teams) {
    this.teams = teams;
    this.teams.sort();

    this.tablePerRound = [{}];
    for (const team of teams) {
      this.tablePerRound[0][team] = {
        position: 1,
        movement: 0,
        lastPosition: 1,
        code: team,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesDrawn: 0,
        gamesLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalsDifference: 0,
        points: 0
      };
    }
  }

  getTableAfterRound(roundNr) {
    return this.tablePerRound[roundNr];
  }

  getDataOfTeamAfterRound(round, team) {
    return this.tablePerRound[round][team];
  }

  addMatch(match) {
    const homeTeam = match.team1.code;
    const awayTeam = match.team2.code;

    const previousRound = match.round - 1;

    const previousRoundDataForHomeTeam = this.getDataOfTeamAfterRound(previousRound, homeTeam);
    const previousRoundDataForAwayTeam = this.getDataOfTeamAfterRound(previousRound, awayTeam);

    const updatedRoundDataForHomeTeam = lodash.cloneDeep(previousRoundDataForHomeTeam);
    const updatedRoundDataForAwayTeam = lodash.cloneDeep(previousRoundDataForAwayTeam);

    updatedRoundDataForHomeTeam.goalsFor += match.score1;
    updatedRoundDataForHomeTeam.goalsAgainst += match.score2;
    updatedRoundDataForHomeTeam.goalsDifference += match.score1 - match.score2;

    updatedRoundDataForAwayTeam.goalsFor += match.score2;
    updatedRoundDataForAwayTeam.goalsAgainst += match.score1;
    updatedRoundDataForAwayTeam.goalsDifference += match.score2 - match.score1;

    updatedRoundDataForHomeTeam.gamesPlayed += 1;
    updatedRoundDataForAwayTeam.gamesPlayed += 1;

    if (!this.tablePerRound[match.round]) {
      this.tablePerRound[match.round] = {};
    }

    if (match.isHomeTeamWin) {
      updatedRoundDataForHomeTeam.points += 3;
      updatedRoundDataForHomeTeam.gamesWon += 1;

      updatedRoundDataForAwayTeam.gamesLost += 1;
    }

    if (match.isDraw) {
      updatedRoundDataForHomeTeam.points += 1;
      updatedRoundDataForHomeTeam.gamesDrawn += 1;

      updatedRoundDataForAwayTeam.points += 1;
      updatedRoundDataForAwayTeam.gamesDrawn += 1;
    }

    if (match.isAwayTeamWin) {
      updatedRoundDataForHomeTeam.gamesLost += 1;

      updatedRoundDataForAwayTeam.points += 3;
      updatedRoundDataForAwayTeam.gamesWon += 1;
    }

    this.tablePerRound[match.round][homeTeam] = updatedRoundDataForHomeTeam;
    this.tablePerRound[match.round][awayTeam] = updatedRoundDataForAwayTeam;

    const sortedTable = this.sortedTableForRound(match.round);

    for (let i = 0; i < sortedTable.length; i++) {
      const team = sortedTable[i].code;
      const previousPosition = this.tablePerRound[match.round - 1][team].position;
      const newPosition = i + 1;

      this.tablePerRound[match.round][team].position = newPosition;
      this.tablePerRound[match.round][team].lastPosition = previousPosition;
      this.tablePerRound[match.round][team].movement = previousPosition - newPosition;
    }
  }

  sortedTableForRound(round) {
    const data = this.getTableAfterRound(round);
    return lodash.sortByOrder(data, ['points', 'goalsDifference', 'goalsFor'], ['desc', 'desc', 'desc']);
  }
}

module.exports = Table;
