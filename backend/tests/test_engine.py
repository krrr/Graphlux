import pytest
from graphlux.engine.context import NodeInputs

def test_node_inputs_get():
    # test_node_inputs_get_with_none
    d = NodeInputs({"a": None})
    # Should return None, not "default"
    assert d.get("a", "default") is None

    # test_node_inputs_missing_key
    d = NodeInputs({"a": 1})
    # Should return default
    assert d.get("b", "default") == "default"

    # test_node_inputs_nested_none
    d = NodeInputs({"node": {"meta": None}})
    # Should return None
    assert d.get("node.meta", "default") is None

    # test_node_inputs_dotted_key_access
    d = NodeInputs({"node:var": {"prop": 123}})
    # Direct access to dotted path
    assert d["node:var.prop"] == 123
    assert d.get("node:var.prop") == 123

def test_node_inputs_key_error():
    d = NodeInputs({"a": 1})
    # Should raise KeyError
    with pytest.raises(KeyError):
        _ = d["b"]

    # test_node_inputs_nested_key_error
    d = NodeInputs({"node": {"a": 1}})
    with pytest.raises(KeyError):
        _ = d["node.b"]
    # test_node_inputs_not_a_dict_error
    d = NodeInputs({"node": 123})
    with pytest.raises(KeyError):
        _ = d["node.property"]

def test_node_inputs_other():
    # test_node_inputs_items
    data = {"a": 1, "b": 2}
    d = NodeInputs(data)
    assert dict(d.items()) == data

    # test_node_inputs_to_dict
    data = {"a": 1, "b": {"c": 2}}
    d = NodeInputs(data)
    assert d.to_dict() == data

    # test_node_inputs_contains
    d = NodeInputs({"a": {"b": 1}})
    assert "a" in d
    assert "a.b" in d
    assert "a.c" not in d
    assert "x" not in d
