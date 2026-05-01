export interface AcfData {
  appid: string;
  name: string;
}

export function parseAcf(content: string): AcfData {
  const get = (key: string): string => {
    const match = content.match(new RegExp(`"${key}"\\s+"([^"]+)"`));
    return match ? match[1] : "";
  };
  return { appid: get("appid"), name: get("name") };
}
