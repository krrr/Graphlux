# Special variable name to indicate that the execution record should be skipped (deleted)
SIGNAL_VAR_SKIP = "__GRAPHLUX_SKIP__"

class EngineSignal:
    """Special control values for the engine."""
    def __init__(self, name: str):
        self.name = name

    def __repr__(self):
        return f"<EngineSignal: {self.name}>"

    def __str__(self):
        return self.name

# Pre-defined signals
SIGNAL_SKIP = EngineSignal("SKIP_EXECUTION")
