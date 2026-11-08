import { errorText, noticeText } from '@/lib/messages';

/** Poruka posle radnje: greška (crveno) ili potvrda (zeleno), uvek i tekstom. */
export function FormMessage({ error, notice }: { error?: unknown; notice?: unknown }) {
  const errorMessage = errorText(error);
  const noticeMessage = noticeText(notice);

  if (errorMessage) {
    return (
      <p
        role="alert"
        className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        {errorMessage}
      </p>
    );
  }
  if (noticeMessage) {
    return (
      <p
        role="status"
        className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
      >
        {noticeMessage}
      </p>
    );
  }
  return null;
}
