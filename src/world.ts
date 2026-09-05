export type Mood = "afternoon" | "sunset" | "mist";

// An interpretive landscape, not a surveyed street map. +Z points to the sea.
export const coastZ = (x: number) =>
  24 + 15 * Math.cos((x + 15) / 65) + 4 * Math.sin(x / 28);
export const groundY = (x: number, z: number) =>
  2.2 + Math.max(0, -z) * 0.055 + Math.sin(x * 0.022) * 0.55;
export const roadZ = (x: number) =>
  coastZ(x) - 21 - 18 * Math.exp(-(((x - 24) / 29) ** 2));
export const buildingSites = [
  { id: "huashi", x: 24, z: 22, width: 25, depth: 20, rotation: 0 },
  { id: "princess", x: -49, z: -32, width: 19, depth: 16, rotation: 0.16 },
  { id: "villa1", x: -17, z: -28, width: 17, depth: 14, rotation: 0.03 },
  { id: "villa2", x: -83, z: -36, width: 18, depth: 17, rotation: 0.2 },
  { id: "villa3", x: 55, z: -31, width: 17, depth: 14, rotation: -0.08 },
  { id: "villa4", x: 6, z: -69, width: 19, depth: 17, rotation: 0.03 },
  { id: "villa5", x: -61, z: -81, width: 19, depth: 17, rotation: 0.12 },
  { id: "villa6", x: 74, z: -77, width: 21, depth: 17, rotation: -0.1 },
  { id: "villa7", x: -116, z: -78, width: 20, depth: 17, rotation: 0.12 },
] as const;

export const landmarks = [
  {
    id: "huashi",
    name: "花石楼",
    english: "HUASHI VILLA",
    subtitle: "一座石楼，半城山海",
    category: "历史建筑",
    position: [24, 27, 22],
    camera: [66, 32, 79],
    target: [23, 12, 20],
    description:
      "花岗岩与鹅卵石砌成的海滨别墅，圆形塔楼静静守望海岸。沿着石阶走近，听海风穿过老窗。",
  },
  {
    id: "princess",
    name: "公主楼",
    english: "PRINCESS VILLA",
    subtitle: "藏在树影里的童话",
    category: "异国风情",
    position: [-49, 24, -32],
    camera: [-12, 30, 12],
    target: [-49, 12, -32],
    description:
      "绿色墙面、陡峭屋顶与小巧塔尖，让这座丹麦风格别墅有了童话般的轮廓。慢一点，发现庭院里的细节。",
  },
  {
    id: "avenue",
    name: "林荫关路",
    english: "TREE-LINED AVENUE",
    subtitle: "把脚步，放慢一点",
    category: "花园街巷",
    position: [-29, 7, 7],
    camera: [-48, 7, 14],
    target: [7, 7, 11],
    description:
      "以中国关隘命名的街道，藏着八大关的日常。梧桐与松树交织成荫，红瓦屋顶在枝叶间若隐若现。",
  },
  {
    id: "coast",
    name: "第二海水浴场",
    english: "NO. 2 BATHING BEACH",
    subtitle: "听见，海的呼吸",
    category: "海岸风光",
    position: [-50, 3, 46],
    camera: [-7, 12, 88],
    target: [-43, 2, 39],
    description:
      "沙滩、礁石与舒缓的海岸弧线，构成八大关朝向黄海的一面。在潮声里，留一段什么都不做的时间。",
  },
] as const;
