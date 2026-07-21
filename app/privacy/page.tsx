export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-slate-950">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-slate-600">Last updated: July 21, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
        <p>
          Yuka SNS Assistant helps the operator create, schedule, and publish social media drafts.
          We only use account data needed to connect to supported social platforms and publish content
          requested by the operator.
        </p>
        <p>
          We may process profile identifiers, usernames, access tokens, post text, publishing results,
          and basic analytics if the operator connects those services. Access tokens are used only to
          call the relevant platform APIs on behalf of the connected account.
        </p>
        <p>
          We do not sell personal information. We do not share connected social account data with third
          parties except service providers required to run the application, such as hosting and API
          providers.
        </p>
        <p>
          To request deletion of data connected to this app, use the data deletion page linked below.
        </p>
        <p>
          Contact: <a className="text-pink-600 underline" href="mailto:blue.nyan.nyan@gmail.com">blue.nyan.nyan@gmail.com</a>
        </p>
        <p>
          <a className="text-pink-600 underline" href="/data-deletion">Data deletion instructions</a>
        </p>
      </section>
    </main>
  );
}
