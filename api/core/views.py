from django.http import JsonResponse

def api_root(request):
    return JsonResponse({"message": "Hello from Django"})
