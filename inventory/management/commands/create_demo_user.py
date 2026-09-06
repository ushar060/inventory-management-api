import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create a demo user from environment variables"

    def handle(self, *args, **options):
        username = os.environ.get("DEMO_USERNAME")
        password = os.environ.get("DEMO_PASSWORD")

        if not username or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Demo credentials not provided. Skipping demo user creation."
                )
            )
            return

        User = get_user_model()

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Demo user '{username}' already exists. Skipping."
                )
            )
            return

        User.objects.create_user(
            username=username,
            password=password,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo user '{username}' created successfully."
            )
        )