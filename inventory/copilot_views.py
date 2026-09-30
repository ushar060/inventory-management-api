from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .copilot import (
    build_copilot_context,
    generate_copilot_response,
)


class CopilotView(APIView):
    """
    StockPilot Copilot API.

    Accepts a natural-language inventory question and
    returns an AI-generated answer based on live
    StockPilot operational data.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):

        question = request.data.get(
            "question",
            ""
        )

        # -------------------------------------------------
        # Validate question type
        # -------------------------------------------------

        if not isinstance(question, str):

            return Response(
                {
                    "error": "Question must be a string."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # Clean question
        # -------------------------------------------------

        question = question.strip()

        # -------------------------------------------------
        # Empty question
        # -------------------------------------------------

        if not question:

            return Response(
                {
                    "error": "Please provide a question."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # Question length
        # -------------------------------------------------

        if len(question) > 1000:

            return Response(
                {
                    "error": (
                        "Question must be 1000 "
                        "characters or less."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # Generate Copilot response
        # -------------------------------------------------

        try:

            context = build_copilot_context(
                question
            )

            answer = generate_copilot_response(
                question,
                context
            )

            return Response(
                {
                    "answer": answer,
                    "source": (
                        "StockPilot operational data"
                    ),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as error:

            print(
                "StockPilot Copilot Error:",
                error
            )

            return Response(
                {
                    "error": (
                        "StockPilot Copilot is "
                        "temporarily unavailable."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )