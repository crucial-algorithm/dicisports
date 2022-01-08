const chars = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ']

function randomIntFromInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export default function HTMLId(length = 20): string {
  const result = new Array(length)
  return result
    .map(() => chars[randomIntFromInterval(0, chars.length)])
    .join('')
}
