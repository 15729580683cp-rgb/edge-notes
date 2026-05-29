import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { useNoteStore } from "../../store/noteStore";

export function SearchBox() {
  const searchKeyword = useNoteStore((state) => state.searchKeyword);
  const searchNotes = useNoteStore((state) => state.searchNotes);
  const [value, setValue] = useState(searchKeyword);

  useEffect(() => {
    setValue(searchKeyword);
  }, [searchKeyword]);

  return (
    <label className="search-box">
      <Search aria-hidden size={16} />
      <input
        aria-label="搜索便签"
        onChange={(event) => {
          const keyword = event.target.value;
          setValue(keyword);
          void searchNotes(keyword);
        }}
        placeholder="搜索"
        spellCheck={false}
        type="search"
        value={value}
      />
    </label>
  );
}
