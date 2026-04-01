import { getTodayValue } from "../utils/formatters";

export const storageKey = "finance-flow-data-v1";

export const categories = {
  expense: ["อาหาร", "เดินทาง", "ที่อยู่อาศัย", "บิล", "ช้อปปิ้ง", "สุขภาพ", "บันเทิง", "อื่นๆ"],
  income: ["เงินเดือน", "โบนัส", "ฟรีแลนซ์", "ขายของ", "ดอกเบี้ย", "อื่นๆ"],
};

export const sampleData = {
  budgets: {
    อาหาร: 8000,
    เดินทาง: 4000,
    บิล: 6000,
  },
  transactions: [
    {
      id: crypto.randomUUID(),
      type: "income",
      description: "เงินเดือน",
      amount: 42000,
      category: "เงินเดือน",
      date: getTodayValue(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      description: "ค่าน้ำมัน",
      amount: 1800,
      category: "เดินทาง",
      date: getTodayValue(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      description: "ซูเปอร์มาร์เก็ต",
      amount: 2350,
      category: "อาหาร",
      date: getTodayValue(),
    },
  ],
};
