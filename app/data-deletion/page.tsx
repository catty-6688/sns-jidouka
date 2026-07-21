export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-slate-950">
      <h1 className="text-3xl font-bold">User Data Deletion</h1>
      <p className="mt-4 text-sm text-slate-600">Last updated: July 21, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
        <p>
          If you want to request deletion of data associated with Yuka SNS Assistant, please send an email
          to the contact address below.
        </p>
        <p>
          Please include the social account username or user ID connected to the app, and write
          &quot;Yuka SNS Assistant data deletion request&quot; in the subject line.
        </p>
        <p>
          We will review the request and delete applicable stored data, including connected account data
          and access tokens, unless retention is required for security, legal, or operational reasons.
        </p>
        <p>
          Contact: <a className="text-pink-600 underline" href="mailto:blue.nyan.nyan@gmail.com">blue.nyan.nyan@gmail.com</a>
        </p>
      </section>
    </main>
  );
}
