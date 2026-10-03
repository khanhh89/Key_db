import type { Language } from '../../../../types';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor, Essentials, Bold, Italic, Paragraph, List, Link } from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
interface AppLinksSectionProps {
  lang: Language;
  appDownloadUrl: string;
  setAppDownloadUrl: (val: string) => void;
  appPlatform: 'android' | 'ios' | 'both';
  setAppPlatform: (val: 'android' | 'ios' | 'both') => void;
  appNote: string;
  setAppNote: (val: string) => void;
}

export function AppLinksSection({
  lang,
  appDownloadUrl,
  setAppDownloadUrl,
  appPlatform,
  setAppPlatform,
  appNote,
  setAppNote,
}: AppLinksSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#64748B]">
            {lang === 'vi' ? 'Link Tải Trực Tiếp (.apk / File / Direct Link):' : 'Direct Download Link (.apk/Direct Link):'}
          </label>
          <input
            className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
            type="text"
            value={appDownloadUrl}
            placeholder="https://drive.google.com/..."
            onChange={(e) => setAppDownloadUrl(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#64748B]">
            🖥️ {lang === 'vi' ? 'Nền tảng hỗ trợ:' : 'Platform:'}
          </label>
          <select
            className="px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F7FB] text-[#1F2937] font-inherit text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:ring-[3px] focus:ring-[#2563EB]/20"
            value={appPlatform}
            onChange={(e) => setAppPlatform(e.target.value as 'android' | 'ios' | 'both')}
          >
            <option value="both">🌐 Cả Android + iOS (Hiện cả 2 nút)</option>
            <option value="android">🤖 Android only (Chỉ hiện nút APK)</option>
            <option value="ios">🍎 iOS only (Chỉ hiện nút IPA)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-[#64748B]">
          📝 {lang === 'vi' ? 'Ghi chú / Lưu ý khi tải:' : 'Notice / Download Note:'}
        </label>
        <div className="rounded-xl overflow-hidden border border-[#E5E7EB] focus-within:border-[#2563EB] focus-within:ring-[3px] focus-within:ring-[#38bdf8]/15 text-black">
          <CKEditor
            editor={ClassicEditor}
            config={{
              licenseKey: 'GPL',
              plugins: [Essentials, Bold, Italic, Paragraph, List, Link],
              toolbar: ['undo', 'redo', '|', 'bold', 'italic', '|', 'bulletedList', 'numberedList', '|', 'link']
            }}
            data={appNote}
            onChange={(_event, editor) => {
              const data = editor.getData();
              setAppNote(data);
            }}
          />
        </div>
      </div>
    </div>
  );
}
