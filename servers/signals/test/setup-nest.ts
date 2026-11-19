// @nestjs/throttler is CommonJS and requires @nestjs/common and @nestjs/core,
// which are ES modules since NestJS 12. Jest links the ES imports of a test
// file in parallel, so that require can reach them while they are still
// linking and fail as a cycle. Loading them here, before any test file,
// makes every later require find them evaluated.
import '@nestjs/common';
import '@nestjs/core';
