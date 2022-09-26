export default omitNilProps;

function omitNilProps<T>(inputObj: T): {
  [K in keyof T]: NonNullable<T[K]>;
} {
  const resultObj: any = {};
  for (const k in inputObj) {
    if (inputObj[k] !== undefined && inputObj[k] !== null) {
      resultObj[k] = inputObj[k];
    }
  }
  return resultObj;
}
