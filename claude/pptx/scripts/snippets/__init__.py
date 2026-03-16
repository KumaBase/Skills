"""Snippet library for OOXML shape generation.

Each snippet module exposes a `generate(context)` function that returns
a list of OOXML XML strings to inject into a slide's <p:spTree>.

Context dict contains:
    unpacked_dir: Path - unpacked PPTX directory
    slide_name: str - e.g. "slide3.xml"
    slide_path: Path - full path to slide XML
    theme: dict - theme tokens from extract_theme.py
    config: dict - snippet-specific configuration
    next_shape_id: int - next available shape ID
    next_rel_id: int - next available relationship ID
"""

_REGISTRY = {}


def register(name):
    """Decorator to register a snippet generator."""
    def decorator(func):
        _REGISTRY[name] = func
        return func
    return decorator


def get_snippet(name):
    """Get a registered snippet generator by name."""
    # Lazy-import all snippet modules
    if not _REGISTRY:
        _load_snippets()
    return _REGISTRY.get(name)


def list_snippets():
    """List all available snippet names."""
    if not _REGISTRY:
        _load_snippets()
    return list(_REGISTRY.keys())


def _load_snippets():
    """Import all snippet modules to trigger registration."""
    from . import card_grid  # noqa: F401
    from . import process_flow  # noqa: F401
    from . import stat_callout  # noqa: F401
    from . import icon_text_rows  # noqa: F401
    from . import comparison_columns  # noqa: F401
