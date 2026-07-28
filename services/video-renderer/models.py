from __future__ import annotations

import re
from typing import Annotated, Literal

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
SAFE_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
NAMED_COLORS = {"blue", "teal", "yellow", "pink", "green"}
VisualAction = Literal[
    "construct",
    "transform",
    "highlight",
    "compare",
    "trace",
]
TeachingRole = Literal[
    "orient",
    "concept",
    "strategy",
    "misconception",
    "connection",
    "verify-generalize",
]
TeachingPurpose = Literal[
    "notice",
    "explain-why",
    "demonstrate",
    "connect",
    "contrast",
    "verify",
    "generalize",
]
UNSAFE_LATEX = re.compile(
    r"\\(?:input|include|write|openout|read|catcode|csname|def|edef|gdef|"
    r"xdef|newcommand|renewcommand|usepackage|documentclass|special|immediate|"
    r"loop|repeat|filecontents|includegraphics)\b",
    re.IGNORECASE,
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LessonOption(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=180)

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if not SAFE_ID.fullmatch(value):
            raise ValueError("option id must be lowercase kebab-case")
        return value


class LessonInteraction(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    afterClip: str = Field(min_length=1, max_length=64)
    eyebrow: str = Field(min_length=1, max_length=100)
    problem: str | None = Field(default=None, max_length=500)
    prompt: str = Field(min_length=1, max_length=360)
    options: Annotated[list[LessonOption], Field(min_length=2, max_length=4)]
    correctOptionId: str = Field(min_length=1, max_length=64)
    correctFeedback: str = Field(min_length=1, max_length=420)
    incorrectFeedback: str = Field(min_length=1, max_length=420)

    @field_validator("id", "afterClip", "correctOptionId")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if not SAFE_ID.fullmatch(value):
            raise ValueError("interaction ids must be lowercase kebab-case")
        return value

    @model_validator(mode="after")
    def validate_correct_option(self) -> "LessonInteraction":
        option_ids = {option.id for option in self.options}
        if self.correctOptionId not in option_ids:
            raise ValueError("correctOptionId does not match an option")
        if len(option_ids) != len(self.options):
            raise ValueError("interaction option ids must be unique")
        return self


class GraphPoint(StrictModel):
    x: float = Field(ge=-1000, le=1000)
    y: float = Field(ge=-1000, le=1000)
    label: str = Field(default="", max_length=80)
    color: str | None = Field(default=None, max_length=16)

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is not None and value not in NAMED_COLORS and not SAFE_COLOR.fullmatch(value):
            raise ValueError("graph color must be a named palette color or hex")
        return value


class GraphFunction(StrictModel):
    id: str | None = Field(default=None, max_length=64)
    expression: str = Field(
        min_length=1,
        max_length=300,
        validation_alias=AliasChoices("expression", "fn", "expr"),
    )
    latex: str | None = Field(default=None, max_length=300)
    label: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=16)

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is not None and value not in NAMED_COLORS and not SAFE_COLOR.fullmatch(value):
            raise ValueError("graph color must be a named palette color or hex")
        return value

    @model_validator(mode="after")
    def validate_label(self) -> "GraphFunction":
        if self.id and not SAFE_ID.fullmatch(self.id):
            raise ValueError("graph function id must be lowercase kebab-case")
        if not self.latex and not self.label:
            raise ValueError("graph function needs latex or a label")
        return self


class GraphVisual(StrictModel):
    kind: Literal["graph"]
    action: VisualAction
    latex: str = Field(default="", max_length=600)
    expression: str | None = Field(default=None, max_length=300)
    functions: list[GraphFunction] = Field(default_factory=list, max_length=4)
    xMin: float | None = Field(default=None, ge=-100, le=100)
    xMax: float | None = Field(default=None, ge=-100, le=100)
    yMin: float | None = Field(default=None, ge=-1000, le=1000)
    yMax: float | None = Field(default=None, ge=-1000, le=1000)
    xDomain: tuple[float, float] | None = None
    yDomain: tuple[float, float] | None = None
    points: list[GraphPoint] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def validate_ranges(self) -> "GraphVisual":
        if self.xDomain:
            self.xMin = self.xMin if self.xMin is not None else self.xDomain[0]
            self.xMax = self.xMax if self.xMax is not None else self.xDomain[1]
        if self.yDomain:
            self.yMin = self.yMin if self.yMin is not None else self.yDomain[0]
            self.yMax = self.yMax if self.yMax is not None else self.yDomain[1]
        if None in (self.xMin, self.xMax, self.yMin, self.yMax):
            raise ValueError("graph needs x and y ranges")
        assert self.xMin is not None
        assert self.xMax is not None
        assert self.yMin is not None
        assert self.yMax is not None
        if self.xMax - self.xMin < 1 or self.yMax - self.yMin < 1:
            raise ValueError("graph ranges must have positive width")
        if not self.expression and not self.functions:
            raise ValueError("graph needs an expression or functions")
        if not self.latex:
            labels = [
                value.latex or value.label or ""
                for value in self.functions
            ]
            self.latex = r"\qquad".join(value for value in labels if value)
        if not self.latex:
            raise ValueError("graph needs display LaTeX")
        return self


class NumberLinePoint(StrictModel):
    value: float = Field(ge=-1000, le=1000)
    label: str = Field(default="", max_length=80)
    color: Literal["blue", "teal", "yellow", "pink", "green"] = "teal"


class NumberLineVisual(StrictModel):
    kind: Literal["number-line"]
    action: VisualAction
    latex: str = Field(min_length=1, max_length=600)
    minimum: float = Field(
        ge=-1000,
        le=1000,
        validation_alias=AliasChoices("minimum", "min"),
    )
    maximum: float = Field(
        ge=-1000,
        le=1000,
        validation_alias=AliasChoices("maximum", "max"),
    )
    step: float | None = Field(default=None, gt=0, le=100)
    points: list[NumberLinePoint] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def validate_range(self) -> "NumberLineVisual":
        if self.maximum <= self.minimum:
            raise ValueError("number-line maximum must exceed minimum")
        if self.step is None:
            self.step = (self.maximum - self.minimum) / 10
        if (self.maximum - self.minimum) / self.step > 30:
            raise ValueError("number line has too many tick intervals")
        return self


class BalanceVisual(StrictModel):
    kind: Literal["balance"]
    action: VisualAction
    latex: str = Field(min_length=1, max_length=600)
    leftLabel: str = Field(min_length=1, max_length=120)
    rightLabel: str = Field(min_length=1, max_length=120)
    balanced: bool = True


class Coordinate(StrictModel):
    x: float = Field(ge=-6, le=6)
    y: float = Field(ge=-3.25, le=3.25)


class GeometryShape(StrictModel):
    type: Literal["line", "arrow", "rectangle", "circle", "dot"]
    start: Coordinate | None = None
    end: Coordinate | None = None
    center: Coordinate | None = None
    width: float | None = Field(default=None, gt=0, le=12)
    height: float | None = Field(default=None, gt=0, le=7)
    radius: float | None = Field(default=None, gt=0, le=5)
    label: str = Field(default="", max_length=100)
    color: Literal["blue", "teal", "yellow", "pink", "green"] = "blue"


class GeometryVisual(StrictModel):
    kind: Literal["geometry"]
    action: VisualAction
    latex: str = Field(min_length=1, max_length=600)
    shapes: Annotated[list[GeometryShape], Field(min_length=1, max_length=16)]


class EquationVisual(StrictModel):
    kind: Literal["equation"]
    action: VisualAction
    latex: str = Field(min_length=1, max_length=600)
    emphasisLatex: str | None = Field(default=None, max_length=180)
    focusLatex: str | None = Field(default=None, max_length=180)
    primaryLabel: str | None = Field(default=None, max_length=80)
    secondaryLatex: str | None = Field(default=None, max_length=600)
    secondaryFocusLatex: str | None = Field(default=None, max_length=180)
    secondaryLabel: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def validate_comparison(self) -> "EquationVisual":
        if self.action == "compare" and not self.secondaryLatex:
            raise ValueError("a comparison needs secondaryLatex")
        return self


Visual = Annotated[
    EquationVisual
    | GraphVisual
    | NumberLineVisual
    | BalanceVisual
    | GeometryVisual,
    Field(discriminator="kind"),
]


class LessonSegment(StrictModel):
    purpose: TeachingPurpose
    narration: str = Field(min_length=1, max_length=420)
    annotation: str = Field(min_length=1, max_length=180)
    motionSeconds: float = Field(default=1.0, ge=0.35, le=2.5)
    visual: Visual

    @field_validator("visual")
    @classmethod
    def block_unsafe_latex(cls, visual: Visual) -> Visual:
        if UNSAFE_LATEX.search(visual.latex):
            raise ValueError("unsafe LaTeX command")
        if isinstance(visual, GraphVisual):
            for function in visual.functions:
                if function.latex and UNSAFE_LATEX.search(function.latex):
                    raise ValueError("unsafe graph LaTeX command")
        if (
            isinstance(visual, EquationVisual)
            and any(
                value and UNSAFE_LATEX.search(value)
                for value in (
                    visual.emphasisLatex,
                    visual.focusLatex,
                    visual.secondaryLatex,
                    visual.secondaryFocusLatex,
                )
            )
        ):
            raise ValueError("unsafe equation comparison LaTeX command")
        return visual


class LessonClip(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    step: int = Field(ge=1, le=8)
    teachingRole: TeachingRole
    title: str = Field(min_length=1, max_length=140)
    bigIdea: str = Field(min_length=1, max_length=220)
    segments: Annotated[list[LessonSegment], Field(min_length=1, max_length=4)]

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if not SAFE_ID.fullmatch(value):
            raise ValueError("clip id must be lowercase kebab-case")
        return value


class LessonCompletion(StrictModel):
    title: str = Field(min_length=1, max_length=220)
    body: str = Field(min_length=1, max_length=420)


class LessonPlan(StrictModel):
    schemaVersion: Literal[2]
    supported: bool
    unsupportedReason: str | None = Field(default=None, max_length=500)
    title: str = Field(min_length=1, max_length=220)
    problem: str = Field(min_length=1, max_length=2_000)
    finalAnswerLatex: str = Field(min_length=1, max_length=600)
    learningGoal: str = Field(min_length=1, max_length=420)
    teachingApproach: str = Field(min_length=1, max_length=600)
    clips: Annotated[list[LessonClip], Field(min_length=1, max_length=6)]
    interactions: Annotated[
        list[LessonInteraction], Field(min_length=0, max_length=4)
    ]
    transferCheck: LessonInteraction
    completion: LessonCompletion

    @field_validator("finalAnswerLatex")
    @classmethod
    def block_unsafe_final_answer_latex(cls, value: str) -> str:
        if UNSAFE_LATEX.search(value):
            raise ValueError("unsafe final-answer LaTeX command")
        return value

    @model_validator(mode="after")
    def validate_references(self) -> "LessonPlan":
        clip_ids = [clip.id for clip in self.clips]
        if len(set(clip_ids)) != len(clip_ids):
            raise ValueError("clip ids must be unique")
        if [clip.step for clip in self.clips] != list(
            range(1, len(self.clips) + 1)
        ):
            raise ValueError("clip steps must be consecutive")
        known = set(clip_ids)
        for interaction in [*self.interactions, self.transferCheck]:
            if interaction.afterClip not in known:
                raise ValueError("interaction references an unknown clip")
        if self.supported and len(self.clips) < 5:
            raise ValueError(
                "supported videos need at least five teaching chapters"
            )
        if not self.supported and not self.unsupportedReason:
            raise ValueError("unsupported lessons need a reason")
        if not self.supported:
            return self

        roles = [clip.teachingRole for clip in self.clips]
        if roles[0] != "orient":
            raise ValueError(
                "the first chapter must orient the learner before calculating"
            )
        if roles[-1] != "verify-generalize":
            raise ValueError(
                "the final chapter must verify and generalize the method"
            )
        for required_role in (
            "concept",
            "strategy",
            "misconception",
        ):
            if required_role not in roles:
                raise ValueError(
                    f"the video needs a {required_role} teaching chapter"
                )

        segments = [
            segment for clip in self.clips for segment in clip.segments
        ]
        purposes = {segment.purpose for segment in segments}
        for required_purpose in (
            "notice",
            "explain-why",
            "demonstrate",
            "connect",
            "contrast",
            "verify",
            "generalize",
        ):
            if required_purpose not in purposes:
                raise ValueError(
                    f"the video needs a {required_purpose} teaching moment"
                )

        visual_kinds = {segment.visual.kind for segment in segments}
        if len(visual_kinds) < 2:
            raise ValueError(
                "a teaching video needs a meaningful non-equation representation"
            )
        non_equation_count = sum(
            segment.visual.kind != "equation" for segment in segments
        )
        if non_equation_count < 2:
            raise ValueError(
                "a teaching video needs at least two non-equation modeling scenes"
            )
        actions = {segment.visual.action for segment in segments}
        if not {"construct", "highlight", "compare"}.issubset(actions):
            raise ValueError(
                "the video must construct, focus, and compare ideas—not show static cards"
            )
        if not any(
            isinstance(segment.visual, EquationVisual)
            and segment.visual.action == "compare"
            and segment.visual.secondaryLatex
            for segment in segments
        ):
            raise ValueError(
                "the video needs a visible side-by-side reasoning comparison"
            )
        return self


class PlanReview(StrictModel):
    valid: bool
    reason: str = Field(default="", max_length=600)

    @model_validator(mode="after")
    def require_rejection_reason(self) -> "PlanReview":
        if not self.valid and not self.reason:
            raise ValueError("an invalid plan needs a rejection reason")
        return self


class RenderTask(StrictModel):
    schemaVersion: Literal[1]
    uid: str = Field(min_length=1, max_length=160)
    jobId: str = Field(pattern=r"^[a-f0-9]{40}$")
    attempt: int = Field(ge=1, le=20)


class CleanupTask(StrictModel):
    schemaVersion: Literal[1]
    uid: str = Field(min_length=1, max_length=160)
    jobId: str = Field(pattern=r"^[a-f0-9]{40}$")
