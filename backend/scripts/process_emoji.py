#!/usr/bin/env python3
"""https://cdn.jsdelivr.net/npm/emoji-picker-element-data@%5E1/en/emojibase/data.json
Process emoji.json: group by 'group' field and merge consecutive Unicode ranges."""

import json

def merge_ranges(code_points):
    """Merge a list of code points into ranges. Returns list of ints or (start, end) tuples."""
    if not code_points:
        return []

    sorted_points = sorted(set(code_points))
    ranges = []
    range_start = sorted_points[0]
    range_prev = sorted_points[0]

    for point in sorted_points[1:]:
        if point == range_prev + 1:
            range_prev = point
        else:
            if range_start == range_prev:
                ranges.append(range_start)
            else:
                ranges.append((range_start, range_prev))
            range_start = point
            range_prev = point

    if range_start == range_prev:
        ranges.append(range_start)
    else:
        ranges.append((range_start, range_prev))

    return ranges

def format_ranges(ranges):
    """Format ranges for display."""
    result = []
    for r in ranges:
        if isinstance(r, tuple):
            result.append(f"0x{r[0]:04X}-0x{r[1]:04X}")
        else:
            result.append(f"0x{r:04X}")
    return result

GROUP_NAMES = {
    -1: 'custom',
    0: 'smileys-emotion',
    1: 'people-body',
    3: 'animals-nature',
    4: 'food-drink',
    5: 'travel-places',
    6: 'activities',
    7: 'objects',
    8: 'symbols',
    9: 'flags',
}

def main():
    groups = {}

    with open("emoji.json", "r", encoding="utf-8") as f:
        # The file is a JSON array
        for item in json.load(f):
            group_id = item.get("group", -1)
            emoji = item.get("emoji", "")

            # Extract code points from emoji (may be multiple like 👨‍🦲)
            # emoji can be emoji + ZWJ + variation selectors, we only want base chars
            code_points = []
            for char in emoji:
                cp = ord(char)
                # Skip variation selectors (0xFE00-0xFE0F) and ZWJ (0x200D)
                if cp not in (0xFE00, 0xFE0F, 0xFE1F, 0x200D):
                    code_points.append(cp)

            if group_id not in groups:
                groups[group_id] = []
            groups[group_id].extend(code_points)

    # Build output structure
    output = {}
    for group_id, code_points in sorted(groups.items()):
        ranges = merge_ranges(code_points)
        output[str(group_id)] = {
            "name": GROUP_NAMES.get(group_id, 'unknown'),
            "ranges": format_ranges(ranges),
            "count": len(code_points),
            "emoji_count": len(code_points)  # approximate
        }

    # Write output
    with open("emoji_grouped.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("Done! Output written to emoji_grouped.json")
    for g, data in output.items():
        print(f"  Group {g}: {len(data['ranges'])} ranges, {data['count']} code points")

if __name__ == "__main__":
    main()
