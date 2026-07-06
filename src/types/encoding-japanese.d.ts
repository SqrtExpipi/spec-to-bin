declare module "encoding-japanese" {
  export interface ConvertOptions {
    from: string;
    to: string;
    type?: "array" | "string";
  }

  const Encoding: {
    stringToCode(value: string): number[];
    convert(value: number[], options: ConvertOptions): number[] | string;
  };

  export default Encoding;
}
