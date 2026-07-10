import { translate } from "./i18n";

export type Translator = (
  key: Parameters<typeof translate>[1],
  params?: Parameters<typeof translate>[2]
) => string;
