export const TOOL_TYPE_OPTIONS = ['코바늘', '대바늘'];

export const CURRICULUM_OPTIONS = ['입문과', '강사과', '해당 없음'];

export const getEnrollmentToolType = (enrollment) =>
  enrollment?.tool_type || enrollment?.classes?.type || '';

export const getEnrollmentDifficulty = (enrollment) =>
  enrollment?.difficulty || enrollment?.classes?.difficulty || '';

export const formatEnrollmentLabel = (enrollment) => {
  const className = enrollment?.classes?.name || '일반 수업';
  const detailParts = [
    getEnrollmentToolType(enrollment),
    getEnrollmentDifficulty(enrollment),
  ].filter(Boolean);

  return detailParts.length > 0
    ? `${className} · ${detailParts.join(' · ')}`
    : className;
};
