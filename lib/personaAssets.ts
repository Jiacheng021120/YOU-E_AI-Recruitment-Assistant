export const personaAssetMap: Record<string, string> = {
  "镇巢鹅": "/assets/personas/zhenchao-goose.png",
  "金羽鹅": "/assets/personas/jinyu-goose.png",
  "惊羽鹅": "/assets/personas/jingyu-goose.png",
  "临飞鹅": "/assets/personas/linfei-goose.png",
  "稳行鹅": "/assets/personas/wenxing-goose.png",
  "候场鹅": "/assets/personas/houchang-goose.png",
  "警戒鹅": "/assets/personas/jingjie-goose.png",
  "断线鸽": "/assets/personas/duanxian-pigeon.png",
  "安栖鹅": "/assets/personas/anxi-goose.png",
  "摇摆鸽": "/assets/personas/yaobai-pigeon.png",
  "观察鸽": "/assets/personas/guancha-pigeon.png",
  "迷航鸽": "/assets/personas/mihang-pigeon.png",
  "静默鸽": "/assets/personas/jingmo-pigeon.png",
  "过路鸽": "/assets/personas/guolu-pigeon.png",
  "躁动鸽": "/assets/personas/zaodong-pigeon.png",
  "远飞鸽": "/assets/personas/yuanfei-pigeon.png"
};

export function getPersonaAsset(personaType: string) {
  return personaAssetMap[personaType] ?? "/assets/personas/jingmo-pigeon.png";
}
