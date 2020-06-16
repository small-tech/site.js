////////////////////////////////////////////////////////////////////////////////
//
// asyncForEach by Sebastien Chopin
//
// https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
//
// Example:
//
// const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
//
// async function main () {
//   await asyncForEach([1, 2, 3], async (num) => {
//     await waitFor(50)
//     console.log(num)
//   })
//   console.log('Done')
// }
//
// main();
//
////////////////////////////////////////////////////////////////////////////////

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = asyncForEach
