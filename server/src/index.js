import dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import env from 'env-var';

// Read in the .env file
dotenv.config();

const HOST = env.get('HOST')
  .default('localhost')
  .asString();

const PORT = env.get('PORT')
  .default('3000')
  .asPortNumber();

console.log(HOST);
console.log(PORT);
console.log(env.get());

function sum(a, b) {
  return a + b;
}

export default sum;
