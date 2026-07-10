declare module "encoding-japanese" {
  export interface ConvertOptions {
    from: string;
    to: string;
    type?: "array" | "string";
  }

  const Encoding: {
    stringToCode(value: string): number[];
    codeToString(value: number[]): string;
    convert(value: number[], options: ConvertOptions): number[] | string;
  };

  export default Encoding;
}
