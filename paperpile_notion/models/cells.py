from typing import List, Dict, Union
from uuid import UUID

from attr import attrs, attrib
from paperpile_notion.models.validators import emojize, notion_colors


__all__ = [
    "RichTextCell",
    "TitleCell",
    "EmojiCell",
    "URLCell",
    "SelectCell",
    "MultiSelectCell",
    "RelationCell",
]


@attrs
class EmojiCell:
    emoji: str = attrib(converter=emojize)


@attrs
class Text:
    content: str = attrib(converter=emojize)


def _format_text(t: str) -> List[Dict[str, Text]]:
    return [{"text": Text(t)}]


@attrs()
class RichTextCell:
    rich_text: List[Dict[str, Text]] = attrib(converter=_format_text)

    @classmethod
    def from_props(cls, props: Dict) -> "RichTextCell":
        props = _extract_key(props, "rich_text")
        try:
            return cls(rich_text=props[0]["plain_text"])
        except (TypeError, IndexError):
            return cls(rich_text=props)

    @property
    def string(self):
        return self.rich_text[0]["text"].content

@attrs()
class TitleCell:
    title: List[Dict[str, Text]] = attrib(converter=_format_text)

    @classmethod
    def from_props(cls, props: Dict) -> "TitleCell":
        props = _extract_key(props, "title")
        try:
            return cls(title=props[0]["plain_text"])
        except (TypeError, IndexError):
            return cls(title=props)

    @property
    def string(self):
        return self.title[0]["text"].content

@attrs()
class URLCell:
    url: str = attrib()

    @url.validator
    def validate_paperpile_url(self, attribute, url: str) -> str:
        paper_url = "https://paperpile.com/app/p"

        try:
            assert UUID(url.replace(paper_url))
        except AssertionError:
            raise ValueError("UUID provided is invalid.")

        try:
            assert url.startswith(paper_url)
        except AssertionError:
            url = f"{paper_url}/{url}"

        return url

    @classmethod
    def from_props(cls, props: Dict) -> "URLCell":
        props = _extract_key(props, "url")
        return cls(url=props)


@attrs()
class ColoredSelect:
    name: str = attrib(converter=emojize)
    color: str = attrib(default=None, converter=notion_colors)


@attrs()
class Select:
    name: str = attrib(converter=emojize)

    @classmethod
    def from_props(cls, props: Dict) -> "Select":
        if type(props) == dict:
            assert "name" in props, f"{props}"
            if "color" not in props:
                return cls(name=props["name"])
        elif type(props) == str:
            return cls(name=props)
        return ColoredSelect(name=props["name"], color=props["color"])


def _make_select(x):
    if isinstance(x, (ColoredSelect, Select)):
        return x
    elif type(x) == dict:
        cls = Select if "color" not in x else ColoredSelect
        return cls(**x)
    elif type(x) in [tuple, list]:
        cls = Select if len(x) == 1 else ColoredSelect
        return cls(*x)
    return Select(x)


@attrs()
class SelectCell:
    select: Select = attrib(converter=_make_select)

    @classmethod
    def from_props(cls, props: Dict) -> "SelectCell":
        props = _extract_key(props, "select")
        return cls(select=Select.from_props(props))


@attrs()
class MultiSelectCell:
    multi_select: List[Select] = attrib(converter=lambda ls: [_make_select(x) for x in ls] if ls else [])

    @classmethod
    def from_props(cls, props: Dict) -> "MultiSelectCell":
        props = _extract_key(props, "multi_select")
        return cls(multi_select=list(map(Select.from_props, props)))


@attrs()
class Relation:
    id = attrib(type=str)

    @classmethod
    def from_props(cls, props: Dict) -> "Relation":
        props = _extract_key(props, "id")
        return cls(id=props)


@attrs()
class RelationCell:
    relation: List[Relation] = attrib()

    @classmethod
    def from_props(cls, props: Dict) -> "RelationCell":
        props = _extract_key(props, "relation")
        return cls(relation=list(map(Relation.from_props, props)))


def _extract_key(props: Dict, key: str) -> Union[Dict, str]:
    try:
        props = props[key]
    except (KeyError, TypeError):
        pass
    finally:
        return props
