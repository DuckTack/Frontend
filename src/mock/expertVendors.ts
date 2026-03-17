import type { IssueType } from "@/src/api/histories";

export type VendorRegion = "서울" | "경기" | "인천" | "부산" | "대구";
export type SortKey = "price" | "rating" | "name";

export type ExpertVendor = {
  id: string;
  name: string;
  region: VendorRegion;
  coverageAreas: string[];
  issueTypes: IssueType[];
  minPrice: number;
  rating: number;
  reviewCount: number;
  phone: string;
  intro: string;
  tags: string[];
};

export const VENDOR_REGIONS: VendorRegion[] = ["서울", "경기", "인천", "부산", "대구"];

export const expertVendors: ExpertVendor[] = [
  {
    id: "seoul-1",
    name: "가온 홈케어",
    region: "서울",
    coverageAreas: ["강남", "송파", "서초"],
    issueTypes: ["MOLD", "LEAK"],
    minPrice: 89000,
    rating: 4.3,
    reviewCount: 118,
    phone: "02-555-1020",
    intro: "곰팡이 제거와 실내 방수 점검을 함께 진행하는 업체입니다.",
    tags: ["곰팡이", "방수", "점검"],
  },
  {
    id: "seoul-2",
    name: "나래 설비수리",
    region: "서울",
    coverageAreas: ["마포", "은평", "서대문"],
    issueTypes: ["LEAK", "CRACK"],
    minPrice: 125000,
    rating: 4.8,
    reviewCount: 203,
    phone: "02-333-4040",
    intro: "누수 탐지 장비를 보유한 설비 수리 전문 업체입니다.",
    tags: ["누수탐지", "배관", "긴급출동"],
  },
  {
    id: "seoul-3",
    name: "다온 클린리페어",
    region: "서울",
    coverageAreas: ["영등포", "동작", "관악"],
    issueTypes: ["MOLD", "ETC"],
    minPrice: 74000,
    rating: 4.1,
    reviewCount: 76,
    phone: "02-877-9191",
    intro: "생활 오염, 곰팡이, 벽면 복구를 함께 보는 홈케어 업체입니다.",
    tags: ["복구", "오염제거", "원룸"],
  },
  {
    id: "seoul-4",
    name: "라움 하우스닥터",
    region: "서울",
    coverageAreas: ["성동", "광진", "중랑"],
    issueTypes: ["CRACK", "MOLD", "LEAK"],
    minPrice: 158000,
    rating: 4.9,
    reviewCount: 312,
    phone: "02-466-8181",
    intro: "균열, 누수, 마감 복구를 한 번에 상담할 수 있는 종합 수리 업체입니다.",
    tags: ["종합수리", "견적", "복구"],
  },
  {
    id: "gyeonggi-1",
    name: "마루 생활수리",
    region: "경기",
    coverageAreas: ["수원", "성남", "용인"],
    issueTypes: ["CRACK", "ETC"],
    minPrice: 68000,
    rating: 4.0,
    reviewCount: 51,
    phone: "031-555-7171",
    intro: "생활 균열 보수와 간단한 마감재 교체를 도와줍니다.",
    tags: ["균열", "생활보수"],
  },
  {
    id: "gyeonggi-2",
    name: "바른 누수케어",
    region: "경기",
    coverageAreas: ["고양", "파주", "김포"],
    issueTypes: ["LEAK"],
    minPrice: 97000,
    rating: 4.6,
    reviewCount: 142,
    phone: "031-888-4545",
    intro: "누수 원인 파악과 응급 보수 중심으로 운영합니다.",
    tags: ["누수", "응급보수"],
  },
  {
    id: "incheon-1",
    name: "서해 클린홈",
    region: "인천",
    coverageAreas: ["부평", "연수", "남동"],
    issueTypes: ["MOLD", "ETC"],
    minPrice: 79000,
    rating: 4.4,
    reviewCount: 64,
    phone: "032-414-2020",
    intro: "곰팡이 및 벽면 오염 제거를 주로 합니다.",
    tags: ["곰팡이", "오염제거"],
  },
  {
    id: "busan-1",
    name: "오션 설비라인",
    region: "부산",
    coverageAreas: ["해운대", "수영", "동래"],
    issueTypes: ["LEAK", "CRACK"],
    minPrice: 119000,
    rating: 4.7,
    reviewCount: 97,
    phone: "051-712-0909",
    intro: "배관과 외벽 균열 보수를 함께 보는 업체입니다.",
    tags: ["배관", "외벽", "긴급출동"],
  },
  {
    id: "daegu-1",
    name: "하루 홈복구",
    region: "대구",
    coverageAreas: ["수성", "달서", "중구"],
    issueTypes: ["MOLD", "CRACK", "ETC"],
    minPrice: 72000,
    rating: 4.2,
    reviewCount: 58,
    phone: "053-622-2323",
    intro: "원룸과 소형 주택 복구 의뢰가 많은 업체입니다.",
    tags: ["원룸", "복구", "벽면"],
  },
];
