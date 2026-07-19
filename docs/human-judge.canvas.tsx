import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  LineChart,
  Pill,
  Row,
  Stack,
  Stat,
  Text,
  useHostTheme,
} from "cursor/canvas";

const rounds = ["최초", "2차", "최종"];
const judges = [
  { name: "40대 로스터리 사장", scores: [59, 82, 90] },
  { name: "30대 신규 카페 사장", scores: [54, 83, 90] },
  { name: "모바일 UX·접근성", scores: [49, 87, 91] },
];

export default function HumanJudgeReport() {
  const theme = useHostTheme();

  return (
    <Stack gap={24} style={{ padding: 24, background: theme.bg.editor, minHeight: "100%" }}>
      <Row align="start" justify="space-between" wrap gap={12}>
        <Stack gap={6}>
          <H1>SAFIL Human Judge</H1>
          <Text tone="secondary">카페 사장님 관점 3회 반복 평가 · 2026-07-19</Text>
        </Stack>
        <Pill tone="success">PASS · 전 평가 90점 이상</Pill>
      </Row>

      <Grid columns="repeat(auto-fit, minmax(180px, 1fr))" gap={12}>
        {judges.map((judge) => (
          <Card key={judge.name}>
            <CardHeader>{judge.name}</CardHeader>
            <CardBody>
              <Stat
                label="최종 점수"
                value={`${judge.scores[2]} / 100`}
                tone="success"
              />
            </CardBody>
          </Card>
        ))}
      </Grid>

      <Stack gap={10}>
        <H2>점수 변화</H2>
        <LineChart
          categories={rounds}
          series={judges.map((judge) => ({
            name: judge.name,
            data: judge.scores,
          }))}
          yMin={40}
          yMax={100}
          height={300}
          showValues
          referenceLines={[{ value: 90, label: "통과 기준", tone: "success" }]}
        />
      </Stack>

      <Grid columns="repeat(auto-fit, minmax(240px, 1fr))" gap={12}>
        <Card>
          <CardHeader>1차 · 여정 복구</CardHeader>
          <CardBody>
            <Text tone="secondary">
              프로필 저장 후 생성 연결, 실제 히스토리와 재사용, 준비 중 기능 비활성화,
              로딩·오류 경계를 구현했습니다.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>2차 · 모바일 복구</CardHeader>
          <CardBody>
            <Text tone="secondary">
              timeout·재시도, 결과 초점 이동, 큰 터치 영역, 소재 추천, 부분 장애 시 결과
              사용을 보강했습니다.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>3차 · 품질과 신뢰</CardHeader>
          <CardBody>
            <Text tone="secondary">
              목적별 프롬프트, 구체적인 생성 이유, 3안 비교, 복사 성공과 기록 실패의 상태
              분리를 반영했습니다.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Callout tone="warning" title="출시 전 남은 확인">
        실제 iPhone/VoiceOver 및 저사양 Android 테스트, 중복 생성 방지, 인증과 rate limit은
        별도 운영 준비가 필요합니다.
      </Callout>
    </Stack>
  );
}
