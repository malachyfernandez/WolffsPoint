/**
 * sim/seedData.ts
 *
 * Constants describing the fake world the audit copy runs against.
 */

export const SIM_USER = {
  userId: 'user_sim_operator',
  name: 'Sim Operator',
  email: 'sim.operator@wolfspoint.test',
};

export const OTHER_GM = {
  userId: 'user_other_gm',
  name: 'Olivia GameMaster',
  email: 'olivia.gm@wolfspoint.test',
};

export const GAME_OP = 'SIMOP1234'; // current user is OPERATOR
export const GAME_PLAYER = 'SIMPLY567'; // current user is a PLAYER
export const GAME_NEWSER = 'SIMNEWS9'; // current user is the NEWSER

export const NUM_PLAYERS = 24;
export const NUM_DAYS = 12;
export const NUM_ROLES = 14;
export const NUM_THREADS = 36;
export const NUM_COMMENTS = 180;
export const NUM_NEWSPAPER_DAYS = 9;

export const PLAYER_NAMES = [
  'Avery Stone', 'Blair Hollow', 'Cassius Reed', 'Dalia Marsh', 'Edwin Crowe',
  'Fiona Lark', 'Gideon Ash', 'Harriet Voss', 'Isaiah Thorn', 'Junia Bell',
  'Kasper Nyx', 'Lorena Frost', 'Milo Draven', 'Nadia Quinn', 'Orson Pike',
  'Petra Vale', 'Quentin Hale', 'Rosa Mirren', 'Silas Wren', 'Tamsin Cole',
  'Ulric Brand', 'Vera Solis', 'Wendell Cross', 'Xenia Fox',
];

export const ROLE_NAMES = [
  'Werewolf', 'Seer', 'Doctor', 'Hunter', 'Villager', 'Witch', 'Mayor',
  'Bodyguard', 'Detective', 'Jester', 'Alpha Wolf', 'Cupido', 'Elder', 'Fool',
];
