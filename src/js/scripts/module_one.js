import hello2 from './module_two.js';

const hello = name => (
  console.log(`Hello, ${name}!`)
);

hello('World');
hello2();

