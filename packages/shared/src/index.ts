/**
 * @paperpiece/shared — single source of truth for types, enums, constants,
 * socket contracts, DTOs, and pure utilities used by every app and package.
 */

// enums & constants
export * from './enums';
export * from './constants';

// domain types
export * from './types/geometry';
export * from './types/player';
export * from './types/room';
export * from './types/game';

// wire contracts
export * from './dto';
export * from './events';

// utilities
export * from './utils/grid';
export * from './utils/misc';
export * from './utils/settings';
