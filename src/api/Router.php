<?php

class Router {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function handleRequest() {
        $request = isset($_GET['request']) ? explode('/', trim($_GET['request'], '/')) : [];
        $resource = isset($request[0]) ? $request[0] : null;
        $id = isset($request[1]) ? $request[1] : null;
        $action = isset($request[2]) ? $request[2] : null;

        $method = $_SERVER['REQUEST_METHOD'];

        switch ($resource) {
            case 'items':
                $controller = new ItemController($this->pdo);
                $controller->processRequest($method, $id, $action);
                break;
            case 'categories':
                $controller = new CategoryController($this->pdo);
                $controller->processRequest($method, $id);
                break;
            case 'export':
                $controller = new ExportController($this->pdo);
                $controller->processRequest($method, $id);
                break;
            case 'notifications':
                $controller = new NotificationController($this->pdo);
                $controller->processRequest($method, $id);
                break;
            default:
                http_response_code(404);
                echo json_encode(['message' => 'Resource not found']);
                break;
        }
    }
}
