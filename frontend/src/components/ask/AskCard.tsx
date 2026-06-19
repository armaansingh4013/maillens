import { useState } from "react";
import Card from "../common/Card";

interface Props {
  onAsk: (
    question: string
  ) => Promise<any>;
}

export default function AskCard({
  onAsk,
}: Props) {
  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [answer, setAnswer] =
    useState<any>(null);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!question.trim()) return;

    setLoading(true);

    try {
      const data = await onAsk(
        question
      );

      setAnswer(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-4 text-2xl font-bold">
        Ask Your Inbox
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <textarea
          value={question}
          onChange={(e) =>
            setQuestion(
              e.target.value
            )
          }
          rows={5}
          placeholder="What invoices need action?"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4"
        />

        <button
          className="rounded-xl bg-cyan-600 px-4 py-3"
          disabled={loading}
        >
          {loading
            ? "Thinking..."
            : "Ask"}
        </button>
      </form>

      {answer && (
        <div className="mt-6">
          <h3 className="mb-2 font-bold">
            Answer
          </h3>

          <p>{answer.answer}</p>

          {answer.matches?.length >
            0 && (
            <>
              <h3 className="mt-6 mb-3 font-bold">
                Sources
              </h3>

              <div className="space-y-3">
                {answer.matches.map(
                  (
                    match: any,
                    index: number
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-700 p-3"
                    >
                      <strong>
                        {
                          match.subject
                        }
                      </strong>

                      <p className="mt-2 text-sm text-slate-400">
                        {
                          match.content
                        }
                      </p>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}