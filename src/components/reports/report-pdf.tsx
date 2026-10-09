/**
 * Lays out the report content from src/engine/report.ts as an A4 PDF. Only
 * imported on click (see report-downloads.tsx), so react-pdf stays out of the
 * page bundle. Black text, grey rules and bold for emphasis, so it reads the
 * same when printed in black and white. Helvetica is built into every PDF
 * reader, so nothing has to be embedded.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import {
  signedText,
  type ReportChange,
  type ReportContent,
  type ReportFact,
} from "@/engine/report";

const INK = "#111111";
const MUTED = "#555555";
const RULE = "#BBBBBB";
const PANEL = "#F2F2F2";

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
  },
  // Set per text style, never on the page or a wrapper: an inherited line
  // height stops react-pdf drawing the page numbers.
  p: { fontSize: 10, lineHeight: 1.4 },
  brand: { fontSize: 9, color: MUTED, marginBottom: 6 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 10 },
  headline: { fontSize: 12, lineHeight: 1.45, marginBottom: 8 },
  note: { fontSize: 9, color: MUTED, lineHeight: 1.4 },
  warn: {
    fontSize: 9,
    borderWidth: 1,
    borderColor: INK,
    padding: 6,
    marginTop: 2,
    lineHeight: 1.4,
  },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  h3: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { borderTopWidth: 1, borderTopColor: INK },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingVertical: 5,
  },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: MUTED },
  item: { flexDirection: "row", marginBottom: 6 },
  marker: { width: 16 },
  itemBody: { flex: 1 },
  box: { backgroundColor: PANEL, borderWidth: 0.5, borderColor: RULE, padding: 10, marginTop: 18 },
  footerLeft: { position: "absolute", bottom: 24, left: 48, fontSize: 8, color: MUTED },
  footerRight: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: "right",
    fontSize: 8,
    color: MUTED,
  },
});

const COLS = { name: "22%", score: "11%", change: "25%", earlier: "25%", named: "17%" };

function ChangeCell({ c, empty }: { c: ReportChange | null; empty: string }) {
  if (!c) return <Text style={s.note}>{empty}</Text>;
  if (c.delta === null) return <Text style={s.note}>No matching answers</Text>;
  return (
    <View>
      <Text>
        {signedText(c.delta)} vs week {c.against}
      </Text>
      <Text style={c.verdict === "clear change" ? s.bold : s.note}>
        {c.verdict === "clear change" ? "Clear change" : "Normal variation"}
      </Text>
    </View>
  );
}

function ScoreTable({ r }: { r: ReportContent }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        <Text style={[s.th, { width: COLS.name }]}>Company</Text>
        <Text style={[s.th, { width: COLS.score }]}>Score</Text>
        <Text style={[s.th, { width: COLS.change }]}>Change vs last week</Text>
        <Text style={[s.th, { width: COLS.earlier }]}>Change vs three weeks back</Text>
        <Text style={[s.th, { width: COLS.named }]}>Named in</Text>
      </View>
      {r.scores.map((c) => (
        <View key={c.brand} style={s.tr} wrap={false}>
          <View style={{ width: COLS.name }}>
            <Text style={c.isClient ? s.bold : undefined}>{c.name}</Text>
            <Text style={s.note}>
              Rank {c.rank} of {r.scores.length}
            </Text>
          </View>
          <Text style={[{ width: COLS.score, fontSize: 14 }, c.isClient ? s.bold : {}]}>
            {c.scoreText}
          </Text>
          <View style={{ width: COLS.change }}>
            <ChangeCell c={c.vsLastWeek} empty="First week of data" />
          </View>
          <View style={{ width: COLS.earlier }}>
            <ChangeCell c={c.vsEarlier} empty="Not enough weeks yet" />
          </View>
          <Text style={{ width: COLS.named }}>{c.namedIn} of answers</Text>
        </View>
      ))}
    </View>
  );
}

function Numbered({ items }: { items: { title: string; detail: string }[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={it.title} style={s.item} wrap={false}>
          <Text style={[s.marker, s.bold]}>{i + 1}.</Text>
          <View style={s.itemBody}>
            <Text style={s.bold}>{it.title}</Text>
            <Text style={s.p}>{it.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t) => (
        <View key={t} style={s.item} wrap={false}>
          <Text style={s.marker}>{"•"}</Text>
          <Text style={[s.itemBody, s.p]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function FactHistory({ facts }: { facts: ReportFact[] }) {
  return (
    <View style={s.table}>
      <View style={s.tr}>
        <Text style={[s.th, { width: "52%" }]}>What AI said, and what is true</Text>
        <Text style={[s.th, { width: "12%" }]}>This week</Text>
        <Text style={[s.th, { width: "12%" }]}>In total</Text>
        <Text style={[s.th, { width: "12%" }]}>First seen</Text>
        <Text style={[s.th, { width: "12%" }]}>Last seen</Text>
      </View>
      {facts.map((f) => (
        <View key={f.text} style={s.tr} wrap={false}>
          <Text style={[s.p, { width: "52%", paddingRight: 8 }]}>{f.claim}</Text>
          <Text style={{ width: "12%" }}>{f.thisWeek}</Text>
          <Text style={{ width: "12%" }}>{f.answers}</Text>
          <Text style={{ width: "12%" }}>Week {f.firstWeek}</Text>
          <Text style={{ width: "12%" }}>Week {f.lastWeek}</Text>
        </View>
      ))}
    </View>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <Text style={s.h2} minPresenceAhead={60}>
      {children}
    </Text>
  );
}

export function ReportDocument({ r }: { r: ReportContent }) {
  const none = r.completenessLevel === "none";
  const warn = r.completenessLevel === "major" || none;
  return (
    <Document title={r.title} author="indexed." subject="AI visibility" creator="indexed.">
      <Page size="A4" style={s.page}>
        <Text style={s.footerLeft} fixed>
          {r.title}
        </Text>
        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <Text style={s.brand}>indexed.</Text>
        <Text style={s.title}>{r.title}</Text>
        <Text style={s.headline}>{r.headline}</Text>
        {r.baselineNote ? (
          <Text style={[s.note, { marginBottom: 6 }]}>{r.baselineNote}</Text>
        ) : null}
        <Text style={warn ? s.warn : s.note}>
          <Text style={s.bold}>Data completeness: </Text>
          {r.completeness}
        </Text>

        {!none && (
          <>
            <Heading>{`Scores in week ${r.week}`}</Heading>
            <ScoreTable r={r} />
            <Text style={[s.note, { marginTop: 6 }]}>{r.scoreNote}</Text>

            <View style={s.box} wrap={false}>
              <Text style={[s.bold, { marginBottom: 4 }]}>How to read this</Text>
              {r.howToRead.map((p) => (
                <Text key={p} style={[s.p, { fontSize: 9, marginBottom: 4 }]}>
                  {p}
                </Text>
              ))}
            </View>

            <Heading>{r.changesTitle}</Heading>
            {r.changes.length ? (
              <Numbered items={r.changes} />
            ) : (
              <Text style={s.note}>{r.changesEmpty}</Text>
            )}

            <Heading>{r.gainedTitle}</Heading>
            {r.gained.length ? (
              <Bullets items={r.gained} />
            ) : (
              <Text style={s.note}>{r.gainedEmpty}</Text>
            )}
          </>
        )}

        <Heading>What AI is getting wrong</Heading>
        <Text style={s.h3}>{`In week ${r.week}'s answers`}</Text>
        {r.factsThisWeek.length ? (
          <Bullets items={r.factsThisWeek.map((f) => `${f.text} ${f.detail}.`)} />
        ) : (
          <Text style={s.note}>No wrong facts in this week&apos;s answers.</Text>
        )}
        <Text style={s.h3} minPresenceAhead={40}>
          {`Every wrong claim up to week ${r.week}`}
        </Text>
        {r.factsHistory.length ? (
          <FactHistory facts={r.factsHistory} />
        ) : (
          <Text style={s.note}>Nothing has contradicted the fact sheet so far.</Text>
        )}

        {r.nextSteps.length > 0 && (
          <>
            <Heading>Suggested next steps</Heading>
            <Numbered items={r.nextSteps} />
            <Text style={s.note}>
              These come from patterns in the answers. They show where to look, not proof of cause.
            </Text>
          </>
        )}
      </Page>
    </Document>
  );
}

export async function reportPdfBlob(r: ReportContent): Promise<Blob> {
  return pdf(<ReportDocument r={r} />).toBlob();
}
