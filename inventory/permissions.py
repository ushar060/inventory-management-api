from rest_framework.permissions import BasePermission


class IsStaffOrReadOnly(BasePermission):
    """
    Staff users can create, update and delete.
    Everyone else can only read.
    """

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        return request.user.is_authenticated and request.user.is_staff