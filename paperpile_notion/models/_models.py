from typing import Union, Dict

from attr import attrs, attrib, fields_dict

from paperpile_notion.models import (
    ensure_cls,
    # TYPES,
    TitleCell as TC,
    RichTextCell as RTC,
    RelationCell as RC,
    SelectCell as SC,
    MultiSelectCell as MSC,
    # URLCell as UC
)

__all__ = ["Author", "RelationalArticle", "MultiSelectArticle", "from_props", ]

@attrs(auto_attribs=True, order=True)
class Author:
    Name: TC         = attrib(converter=ensure_cls(TC))
    Disciplines: MSC = attrib(converter=ensure_cls(MSC), default=[":lab_coat: Research"])


@attrs(auto_attribs=True, order=True)
class RelationalArticle:
    Title: TC     = attrib(converter=ensure_cls(TC))
    # URL: UC       = attrib(converter=ensure_cls(UC))
    ID: RTC       = attrib(converter=ensure_cls(RTC), default=None)
    Authors: RC   = attrib(converter=ensure_cls(RC) , default=None)
    Keywords: MSC = attrib(converter=ensure_cls(MSC), default=None)
    Folders: MSC  = attrib(converter=ensure_cls(MSC), default=None)
    Fields: MSC   = attrib(converter=ensure_cls(MSC), default=None)
    Methods: MSC  = attrib(converter=ensure_cls(MSC), default=None)
    Status: SC    = attrib(converter=ensure_cls(SC) , default=None)
    Venue: SC     = attrib(converter=ensure_cls(SC) , default=None)


@attrs(auto_attribs=True, order=True)
class MultiSelectArticle:
    Title: TC     = attrib(converter=ensure_cls(TC))
    # URL: UC       = attrib(converter=ensure_cls(UC))
    ID: RTC       = attrib(converter=ensure_cls(RTC), default=None)
    Authors: RC   = attrib(converter=ensure_cls(RC) , default=None)
    Keywords: MSC = attrib(converter=ensure_cls(MSC), default=None)
    Folders: MSC  = attrib(converter=ensure_cls(MSC), default=None)
    Fields: MSC   = attrib(converter=ensure_cls(MSC), default=None)
    Methods: MSC  = attrib(converter=ensure_cls(MSC), default=None)
    Status: SC    = attrib(converter=ensure_cls(SC) , default=None)
    Venue: SC     = attrib(converter=ensure_cls(SC) , default=None)


def from_props(cls, props: Dict) -> Union[RelationalArticle, MultiSelectArticle, Author]:
    fields = fields_dict(cls)
    keys = list(filter(lambda x: x in fields.keys(), props.keys()))
    props = {key: props[key] for key in keys}
    props = {key: fields[key].type.from_props(value) for key, value in props.items()}
    return cls(**props)