/** 모바일 화면용 짧은 API 메시지 */
export const mobileMsg = {
  invalidInput: "입력값을 확인해 주세요.",
  invalidJson: "요청 형식이 올바르지 않습니다.",
  serverError: "잠시 후 다시 시도해 주세요.",
  dbNotReady: "저장소 연결이 필요해요. 관리자에게 문의해 주세요.",
  notFound: "찾을 수 없어요.",

  profile: {
    nameRequired: "카페 이름을 입력해 주세요.",
    locationRequired: "위치를 입력해 주세요.",
  },
  copy: {
    messageTooShort: "두 글자 이상 적어 주세요.",
  },
  image: {
    photoRequired: "사진을 선택해 주세요.",
    titleRequired: "이미지에 넣을 제목을 적어 주세요.",
    generateFailed: "이미지를 만들지 못했어요. 다시 시도해 주세요.",
    tooManyPhotos: "참고 사진은 최대 6장까지예요.",
  },
  notice: {
    detailsRequired: "안내 내용을 적어 주세요.",
  },
  upload: {
    noFile: "사진을 선택해 주세요.",
    badType: "JPG·PNG·WEBP만 가능해요.",
    tooLarge: "8MB 이하 사진만 가능해요.",
    notFound: "사진을 찾을 수 없어요.",
    badPath: "잘못된 경로예요.",
    storageNotReady: "사진 저장소 연결이 필요해요.",
  },
  history: {
    notFound: "기록을 찾을 수 없어요.",
    nothingToUpdate: "변경할 항목이 없어요.",
  },
  ai: {
    insufficient: "결과를 만들지 못했어요. 다시 시도해 주세요.",
  },
} as const;
